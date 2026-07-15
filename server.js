const http = require("http");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const root = __dirname;
const port = Number(process.env.PORT || 3200);

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

async function handleEnquiry(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const smtp = getSmtpConfig();

  if (!smtp) {
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

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      requireTLS: smtp.port !== 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

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

    await transporter.sendMail({
      from: `"Norvix Builder Website" <${smtp.from}>`,
      to: smtp.to,
      replyTo: email,
      subject: `New Norvix Builder LTD enquiry from ${name}`,
      text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
      html: `<p>Someone submitted the Norvix Builder LTD website enquiry form.</p><table style="border-collapse:collapse;">${htmlRows}</table>`,
    });

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

  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requestedPath = cleanPath || "index.html";
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
