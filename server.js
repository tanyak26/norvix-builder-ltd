const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const root = __dirname;
const port = Number(process.env.PORT || 3200);
const routes = new Map([
  ["", "index.html"],
  ["services", "services.html"],
  ["projects", "projects.html"],
  ["process", "process.html"],
  ["contact", "contact.html"],
]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.SMTP_TO || from;

  if (!host || !user || !pass || !from || !to) {
    return null;
  }

  return { host, port, user, pass, from, to };
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Norvix Builder <website@norvixbuilderltd.co.uk>";
  const to = process.env.MAIL_TO || process.env.SMTP_TO || "info@norvixbuilderltd.co.uk";

  if (!apiKey || !from || !to) {
    return null;
  }

  return { apiKey, from, to };
}

async function sendWithResend(config, enquiry) {
  const payload = JSON.stringify({
    from: config.from,
    to: [config.to],
    reply_to: enquiry.email,
    subject: `New Norvix Builder LTD enquiry from ${enquiry.name}`,
    text: enquiry.rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    html: `<p>Someone submitted the Norvix Builder LTD website enquiry form.</p><table style="border-collapse:collapse;">${enquiry.htmlRows}</table>`,
  });

  await new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 15000,
      },
      (response) => {
        let details = "";

        response.on("data", (chunk) => {
          details += chunk;
        });

        response.on("end", () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }

          reject(new Error(`Resend failed: ${response.statusCode} ${details}`));
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Resend request timed out"));
    });
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function sendWithSmtp(config, enquiry) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"Norvix Builder Website" <${config.from}>`,
    to: config.to,
    replyTo: enquiry.email,
    subject: `New Norvix Builder LTD enquiry from ${enquiry.name}`,
    text: enquiry.rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    html: `<p>Someone submitted the Norvix Builder LTD website enquiry form.</p><table style="border-collapse:collapse;">${enquiry.htmlRows}</table>`,
  });
}

async function handleEnquiry(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const resend = getResendConfig();
  const smtp = getSmtpConfig();

  if (!resend && !smtp) {
    sendJson(res, 500, { error: "Email service is not configured" });
    return;
  }

  try {
    const data = await readJson(req);
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    const email = String(data.email || "").trim();
    const service = String(data.service || "").trim();
    const location = String(data.location || "").trim();
    const message = String(data.message || "").trim();

    if (!name || !phone || !email || !message) {
      sendJson(res, 400, { error: "Please complete the required fields" });
      return;
    }

    const rows = [
      ["Name", name],
      ["Phone", phone],
      ["Email", email],
      ["Service", service],
      ["Project location", location || "Not provided"],
      ["Project details", message],
    ];

    const htmlRows = rows
      .map(([label, value]) => `<tr><th align="left" style="padding:8px;border:1px solid #ddd;">${escapeHtml(label)}</th><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`)
      .join("");

    const enquiry = { name, email, rows, htmlRows };

    if (resend) {
      await sendWithResend(resend, enquiry);
    } else {
      await sendWithSmtp(smtp, enquiry);
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Enquiry send failed:", error.message);
    sendJson(res, 500, { error: "Email could not be sent" });
  }
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/enquiry") {
    handleEnquiry(req, res);
    return;
  }

  if (url.pathname.endsWith(".html")) {
    const cleanUrl = url.pathname === "/index.html" ? "/" : url.pathname.replace(/\.html$/, "");
    res.writeHead(301, {
      Location: cleanUrl + url.search,
      "X-Content-Type-Options": "nosniff",
    });
    res.end();
    return;
  }

  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requestedPath = routes.get(cleanPath) || cleanPath || "index.html";
  const filePath = path.resolve(root, requestedPath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      sendFile(res, path.join(filePath, "index.html"));
      return;
    }

    if (!error && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, path.join(root, "index.html"));
  });
});

server.listen(port, () => {
  console.log(`Norvix Builder LTD site running at http://127.0.0.1:${port}`);
});
