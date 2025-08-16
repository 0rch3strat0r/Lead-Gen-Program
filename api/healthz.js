export default function handler(_req, res) {
  res.status(200).json({ ok: true, uptime: process.uptime() });
}