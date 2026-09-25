import PDFDocument from "pdfkit";

const COLORS = {
  background: "#f9fafb",
  navy: "#0b1220",
  action: "#2563eb",
  accent: "#fbbf24",
  muted: "#6b7280",
  body: "#374151",
  divider: "#d7dce3",
  soft: "#eef2f7",
};

const PAGE = { width: 595.28, height: 841.89, left: 48, right: 48, top: 48, bottom: 54 };
const CONTENT_WIDTH = PAGE.width - PAGE.left - PAGE.right;
const PLATFORM_PHONE = "+1 (862) 340-2213";
const valueOrUnavailable = (value) => value || "Not provided";
const fullName = (player) => `${player.firstName || ""} ${player.lastName || ""}`.trim();

function fillPage(document) {
  document.save().rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.background).restore();
}

function drawFooter(document, pageNumber, pageCount) {
  const y = PAGE.height - 32;
  document.save().strokeColor(COLORS.divider).lineWidth(0.6).moveTo(PAGE.left, y - 10).lineTo(PAGE.width - PAGE.right, y - 10).stroke();
  document.font("Helvetica").fontSize(7.5).fillColor(COLORS.muted).text("FootballBank International", PAGE.left, y, { width: 180 });
  document.text(`contact@footballbank.soccer  |  ${PLATFORM_PHONE}`, PAGE.left + 180, y, { width: 170, align: "center", ellipsis: true });
  document.text(`${pageNumber} / ${pageCount}`, PAGE.width - PAGE.right - 80, y, { width: 80, align: "right" });
  document.restore();
}

function startPage(document) {
  document.addPage();
  fillPage(document);
  document.x = PAGE.left;
  document.y = PAGE.top;
}

function ensureSpace(document, height) {
  if (document.y + height > PAGE.height - PAGE.bottom) startPage(document);
}

function drawSectionTitle(document, title) {
  ensureSpace(document, 42);
  document.moveDown(0.9);
  document.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.navy).text(title.toUpperCase(), PAGE.left, document.y, { characterSpacing: 0.5 });
  document.moveDown(0.35);
  document.strokeColor(COLORS.action).lineWidth(1.5).moveTo(PAGE.left, document.y).lineTo(PAGE.left + 42, document.y).stroke();
  document.strokeColor(COLORS.divider).lineWidth(0.6).moveTo(PAGE.left + 52, document.y).lineTo(PAGE.width - PAGE.right, document.y).stroke();
  document.moveDown(0.65);
}

function drawDetailRows(document, items) {
  const columnWidth = (CONTENT_WIDTH - 28) / 2;
  const rowHeight = 34;
  for (let index = 0; index < items.length; index += 2) {
    ensureSpace(document, rowHeight);
    const y = document.y;
    [items[index], items[index + 1]].forEach((item, column) => {
      if (!item) return;
      const x = PAGE.left + column * (columnWidth + 28);
      document.font("Helvetica").fontSize(7.5).fillColor(COLORS.muted).text(item[0].toUpperCase(), x, y, { width: columnWidth, characterSpacing: 0.35 });
      document.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.navy).text(String(valueOrUnavailable(item[1])), x, y + 12, { width: columnWidth, ellipsis: true });
      document.strokeColor(COLORS.divider).lineWidth(0.5).moveTo(x, y + 28).lineTo(x + columnWidth, y + 28).stroke();
    });
    document.y = y + rowHeight;
  }
}

function drawTable(document, headers, rows, widths) {
  const rowHeight = 22;
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const drawRow = (row, header = false) => {
    ensureSpace(document, rowHeight);
    const y = document.y;
    let x = PAGE.left;
    document.save().fillColor(header ? COLORS.soft : COLORS.background).rect(PAGE.left, y, tableWidth, rowHeight).fill();
    document.restore();
    document.strokeColor(COLORS.divider).lineWidth(0.5).moveTo(PAGE.left, y + rowHeight).lineTo(PAGE.left + tableWidth, y + rowHeight).stroke();
    row.forEach((value, index) => {
      document.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(header ? 7.5 : 8.5).fillColor(COLORS.navy).text(String(valueOrUnavailable(value)), x + 6, y + 7, { width: widths[index] - 12, ellipsis: true });
      x += widths[index];
    });
    document.y = y + rowHeight;
  };

  drawRow(headers, true);
  rows.forEach((row) => drawRow(row));
}

export function generatePlayerResumePdf(player) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: `${fullName(player)} - FootballBank International`, Author: "FootballBank International" } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    fillPage(document);
    document.x = PAGE.left;
    document.y = PAGE.top;

    document.rect(PAGE.left, 48, 52, 52).fill(COLORS.navy);
    document.font("Helvetica-Bold").fontSize(22).fillColor("#ffffff").text("F", 62, 62);
    document.fillColor(COLORS.accent).text("B", 77, 62);
    document.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.navy).text("FootballBank", 116, 53);
    document.font("Helvetica-Bold").fontSize(7.5).fillColor(COLORS.action).text("I N T E R N A T I O N A L", 117, 79);
    document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("contact@footballbank.soccer", 370, 57, { width: 177, align: "right" });
    document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(PLATFORM_PHONE, 370, 72, { width: 177, align: "right" });
    document.strokeColor(COLORS.action).lineWidth(2).moveTo(PAGE.left, 119).lineTo(PAGE.width - PAGE.right, 119).stroke();
    document.y = 145;

    document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.action).text("PROFESSIONAL PLAYER RESUME", PAGE.left, document.y, { characterSpacing: 0.8 });
    document.moveDown(0.45).font("Helvetica-Bold").fontSize(29).fillColor(COLORS.navy).text(fullName(player), PAGE.left, document.y, { width: CONTENT_WIDTH });
    document.moveDown(0.25).font("Helvetica").fontSize(12).fillColor(COLORS.muted).text(`${valueOrUnavailable(player.position)} | ${valueOrUnavailable(player.country)}`);
    document.moveDown(0.3).fontSize(8.5).fillColor(COLORS.body).text(`Player contact: ${valueOrUnavailable(player.email)}  |  ${valueOrUnavailable(player.phone)}  |  ${valueOrUnavailable(player.country)}`);

    drawSectionTitle(document, "Player details");
    drawDetailRows(document, [
      ["Date of birth", player.dob], ["Height", player.height], ["Weight", player.weight], ["Preferred foot", player.foot],
      ["Contract status", player.contractStatus], ["Available from", player.availableFrom], ["Preferred leagues", player.preferredLeagues], ["Country code", player.countryCode],
    ]);

    if (player.description) {
      drawSectionTitle(document, "Profile");
      ensureSpace(document, 60);
      document.font("Helvetica").fontSize(10).fillColor(COLORS.body).text(player.description, PAGE.left, document.y, { width: CONTENT_WIDTH, lineGap: 4, align: "left" });
    }

    const stats = player.stats || {};
    const statRows = Object.entries(stats).flatMap(([group, values]) => Object.entries(values || {}).map(([label, value]) => [group, label, value]));
    if (statRows.length) {
      drawSectionTitle(document, "Performance statistics");
      drawTable(document, ["Category", "Metric", "Value"], statRows, [145, 190, 164]);
    }

    const clubHistory = Array.isArray(player.clubHistory) ? player.clubHistory : [];
    if (clubHistory.length) {
      drawSectionTitle(document, "Club history");
      drawTable(document, ["Club", "Position", "Period"], clubHistory.map((club) => [club.clubName, club.position, `${club.startDate || ""} - ${club.endDate || "Present"}`]), [190, 145, 164]);
    }

    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      document.switchToPage(index);
      drawFooter(document, index + 1, range.count);
    }
    document.end();
  });
}
