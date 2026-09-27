import PDFDocument from "pdfkit";
import { formatPhoneNumber } from "./formatPhoneNumber.js";

const COLORS = {
  paper: "#ffffff",
  sidebar: "#edf0f4",
  navy: "#14263f",
  gold: "#c6a64b",
  muted: "#647084",
  body: "#273244",
  divider: "#cbd2dc",
  soft: "#f4f6f8",
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 22;
const SIDEBAR = { x: MARGIN, width: 170, inner: 12 };
const MAIN = { x: 210, width: PAGE.width - 232 };
const PAGE_BOTTOM = PAGE.height - 24;
const valueOrUnavailable = (value) => value || "Not provided";
const fullName = (player) => `${player.firstName || ""} ${player.lastName || ""}`.trim();

function normalizeValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") return "";
  return value == null ? "" : String(value).trim();
}

function clampWords(value, maxWords) {
  const text = normalizeValue(value);
  const words = text.match(/\S+/g) || [];
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}...` : text;
}

function fillPage(document) {
  document.save().rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.paper).restore();
  document.save().rect(SIDEBAR.x, MARGIN, SIDEBAR.width, PAGE.height - MARGIN * 2).fill(COLORS.sidebar).restore();
}

function drawSectionBar(document, title, x, y, width) {
  document.save().rect(x, y, width, 19).fill(COLORS.navy).restore();
  document.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.gold).text(title.toUpperCase(), x + 7, y + 4, {
    width: width - 14,
    characterSpacing: 0.35,
    ellipsis: true,
    lineBreak: false,
  });
  return y + 26;
}

function fitText(document, value, { font = "Helvetica", fontSize = 8.5, width, maxHeight, lineGap = 2 }) {
  const original = normalizeValue(value);
  if (!original) return { text: "Not provided", height: fontSize + 2 };

  document.font(font).fontSize(fontSize);
  const words = original.split(/\s+/);
  let text = original;
  let truncated = false;
  while (words.length && document.heightOfString(text, { width, lineGap }) > maxHeight) {
    words.pop();
    text = words.join(" ");
    truncated = true;
  }
  if (truncated && text) {
    while (text && document.heightOfString(`${text}...`, { width, lineGap }) > maxHeight) {
      text = text.slice(0, text.lastIndexOf(" "));
    }
    text = text ? `${text}...` : "...";
  }

  return {
    text,
    height: Math.min(document.heightOfString(text, { width, lineGap }), maxHeight),
  };
}

function drawSidebarField(document, label, value, x, y, width) {
  document.font("Helvetica-Bold").fontSize(7.3).fillColor(COLORS.muted).text(label.toUpperCase(), x, y, {
    width,
    characterSpacing: 0.25,
    lineBreak: false,
    ellipsis: true,
  });
  const text = normalizeValue(value) || "Not provided";
  document.font("Helvetica-Bold").fontSize(9.3);
  const valueHeight = Math.max(12, document.heightOfString(text, { width, lineGap: 1 }));
  document.fillColor(COLORS.body).text(text, x, y + 10, { width, height: valueHeight, lineGap: 1 });
  return y + valueHeight + 19;
}

function drawMainSection(document, title, y, ensureSpace) {
  const sectionY = ensureSpace(42) + 16;
  document.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.navy).text(title.toUpperCase(), MAIN.x, sectionY, {
    width: MAIN.width,
    characterSpacing: 0.45,
    lineBreak: false,
  });
  document.strokeColor(COLORS.gold).lineWidth(1.4).moveTo(MAIN.x, sectionY + 16).lineTo(MAIN.x + 38, sectionY + 16).stroke();
  document.strokeColor(COLORS.divider).lineWidth(0.6).moveTo(MAIN.x + 46, sectionY + 16).lineTo(MAIN.x + MAIN.width, sectionY + 16).stroke();
  return sectionY + 26;
}

async function fetchPortrait(url) {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.protocol !== "https:" ||
      !["firebasestorage.googleapis.com", "storage.googleapis.com"].includes(parsedUrl.hostname)
    ) {
      return null;
    }

    const response = await fetch(parsedUrl, { signal: AbortSignal.timeout(5000) });
    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !["image/jpeg", "image/png"].includes(contentType)) return null;

    const image = Buffer.from(await response.arrayBuffer());
    return image.length <= 8 * 1024 * 1024 ? image : null;
  } catch {
    return null;
  }
}

export async function generatePlayerResumePdf(player) {
  const portrait = await fetchPortrait(player.headshotUrl || player.imageUrl?.[0]);

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: `${fullName(player)} - Player Resume`, Author: fullName(player) },
    });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    fillPage(document);
    const sidebarX = SIDEBAR.x + SIDEBAR.inner;
    const sidebarWidth = SIDEBAR.width - SIDEBAR.inner * 2;
    const portraitX = sidebarX;
    const portraitY = 30;
    const portraitWidth = sidebarWidth;
    const portraitHeight = 230;

    document.save().rect(portraitX, portraitY, portraitWidth, portraitHeight).fill(COLORS.navy).restore();
    if (portrait) {
      document.save().rect(portraitX, portraitY, portraitWidth, portraitHeight).clip();
      document.image(portrait, portraitX, portraitY, {
        cover: [portraitWidth, portraitHeight],
        align: "center",
        valign: "center",
      });
      document.restore();
    } else {
      const initials = `${player.firstName?.[0] || ""}${player.lastName?.[0] || ""}`.toUpperCase() || "P";
      document.font("Helvetica-Bold").fontSize(38).fillColor("#ffffff").text(initials, portraitX, portraitY + 66, {
        width: portraitWidth,
        align: "center",
        lineBreak: false,
      });
    }

    let sidebarY = 272;
    sidebarY = drawSectionBar(document, "Player profile", sidebarX, sidebarY, sidebarWidth);
    const profileText = clampWords(player.description || "No profile summary provided.", 80);
    document.font("Helvetica").fontSize(8.7);
    const profileHeight = document.heightOfString(profileText, { width: sidebarWidth, lineGap: 2 });
    document.fillColor(COLORS.body).text(profileText, sidebarX, sidebarY, {
      width: sidebarWidth,
      height: profileHeight,
      lineGap: 2,
    });
    sidebarY += Math.max(46, profileHeight) + 16;

    sidebarY = drawSectionBar(document, "Player details", sidebarX, sidebarY, sidebarWidth);
    const sidebarFields = [
      ["Current club", normalizeValue(player.currentClub) || "Not provided"],
      ["Country", player.country],
      ["Date of birth", player.dob],
      ["Height", player.height],
      ["Weight", player.weight],
      ["Preferred foot", player.foot],
      ["Preferred leagues", player.preferredLeagues],
    ];
    for (const [label, value] of sidebarFields) {
      if (label === "Current club" || normalizeValue(value)) {
        sidebarY = drawSidebarField(document, label, value, sidebarX, sidebarY, sidebarWidth);
      }
    }

    let mainY = 30;
    const drawContinuationHeader = () => {
      fillPage(document);
      document.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.navy).text(fullName(player).toUpperCase(), MAIN.x, 30, {
        width: MAIN.width,
        ellipsis: true,
        lineBreak: false,
      });
      document.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("PLAYER RESUME - CONTINUED", MAIN.x, 52, {
        width: MAIN.width,
        characterSpacing: 0.6,
      });
      mainY = 78;
    };
    const ensureMainSpace = (height) => {
      if (mainY + height <= PAGE_BOTTOM) return mainY;
      document.addPage();
      drawContinuationHeader();
      return mainY;
    };

    const nameParts = [player.firstName, player.lastName].filter(Boolean);
    nameParts.forEach((part, index) => {
      const text = String(part).toUpperCase();
      let fontSize = 34;
      document.font("Helvetica-Bold");
      while (fontSize > 19 && document.fontSize(fontSize).widthOfString(text) > MAIN.width) fontSize -= 1;
      document.fontSize(fontSize).fillColor(index === 0 ? COLORS.navy : COLORS.gold).text(text, MAIN.x, mainY, {
        width: MAIN.width,
        lineBreak: false,
      });
      mainY += 37;
    });

    const bandY = mainY + 2;
    document.save().rect(MAIN.x, bandY, MAIN.width, 24).fill(COLORS.navy).restore();
    document.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff").text(valueOrUnavailable(player.position).toUpperCase(), MAIN.x + 9, bandY + 7, {
      width: MAIN.width * 0.48,
      ellipsis: true,
      lineBreak: false,
    });
    document.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.gold).text(normalizeValue(player.currentClub) || normalizeValue(player.country) || "PLAYER", MAIN.x + MAIN.width * 0.5, bandY + 7, {
      width: MAIN.width * 0.48 - 9,
      align: "right",
      ellipsis: true,
      lineBreak: false,
    });
    mainY = bandY + 38;

    mainY = drawMainSection(document, "Contact", mainY, ensureMainSpace);
    const contactItems = [
      ["Email", player.email],
      ["Phone", formatPhoneNumber(player.phone, player.phoneCountryCode)],
      ["Country", player.country],
    ].filter(([, value]) => normalizeValue(value));
    const contactColumnWidth = (MAIN.width - 18) / 2;
    contactItems.forEach(([label, value], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MAIN.x + column * (contactColumnWidth + 18);
      const y = mainY + row * 31;
      document.font("Helvetica-Bold").fontSize(7.3).fillColor(COLORS.muted).text(label.toUpperCase(), x, y, {
        width: contactColumnWidth,
        characterSpacing: 0.3,
        lineBreak: false,
      });
      document.font("Helvetica").fontSize(9.2).fillColor(COLORS.body).text(normalizeValue(value), x, y + 10, {
        width: contactColumnWidth,
        ellipsis: true,
        lineBreak: false,
      });
    });
    mainY += Math.ceil(contactItems.length / 2) * 31 + 8;

    const statRows = Object.entries(player.stats || {}).flatMap(([group, values]) =>
      values && typeof values === "object"
        ? Object.entries(values)
            .filter(([, value]) => value !== "" && value != null)
            .map(([label, value]) => [`${group} · ${label.replace(/([A-Z])/g, " $1")}`, value])
        : [],
    );
    mainY = drawMainSection(document, "Athlete stats", mainY, ensureMainSpace);
    if (statRows.length) {
      const columns = 3;
      const gap = 6;
      const cellWidth = (MAIN.width - gap * (columns - 1)) / columns;
      const cellHeight = 43;
      for (let index = 0; index < statRows.length; index += columns) {
        ensureMainSpace(cellHeight + 6);
        statRows.slice(index, index + columns).forEach(([label, value], column) => {
          const x = MAIN.x + column * (cellWidth + gap);
          document.save().rect(x, mainY, cellWidth, cellHeight).fill(COLORS.soft).restore();
          document.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.navy).text(String(value), x + 7, mainY + 4, {
            width: cellWidth - 14,
            ellipsis: true,
            lineBreak: false,
          });
          document.font("Helvetica").fontSize(7.2).fillColor(COLORS.muted).text(String(label).toUpperCase(), x + 7, mainY + 27, {
            width: cellWidth - 14,
            ellipsis: true,
            lineBreak: false,
          });
        });
        mainY += cellHeight + 6;
      }
    } else {
      ensureMainSpace(18);
      document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted).text("No statistics provided.", MAIN.x, mainY, { width: MAIN.width });
      mainY += 18;
    }

    const clubHistory = Array.isArray(player.clubHistory) ? player.clubHistory : [];
    mainY = drawMainSection(document, "Club history", mainY + 4, ensureMainSpace);
    if (clubHistory.length) {
      for (const club of clubHistory) {
        ensureMainSpace(38);
        document.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.navy).text(valueOrUnavailable(club.clubName), MAIN.x, mainY, {
          width: MAIN.width * 0.55,
          ellipsis: true,
          lineBreak: false,
        });
        document.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.gold).text(valueOrUnavailable(club.position), MAIN.x + MAIN.width * 0.58, mainY, {
          width: MAIN.width * 0.42,
          align: "right",
          ellipsis: true,
          lineBreak: false,
        });
        document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted).text(`${club.startDate || ""} - ${club.endDate || "Present"}`, MAIN.x, mainY + 13, {
          width: MAIN.width,
          ellipsis: true,
          lineBreak: false,
        });
        document.strokeColor(COLORS.divider).lineWidth(0.5).moveTo(MAIN.x, mainY + 31).lineTo(MAIN.x + MAIN.width, mainY + 31).stroke();
        mainY += 38;
      }
    } else {
      ensureMainSpace(18);
      document.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted).text("No club history provided.", MAIN.x, mainY, { width: MAIN.width });
      mainY += 18;
    }

    const availability = [
      ["Contract status", player.contractStatus],
      ["Available from", player.availableFrom],
    ].filter(([, value]) => normalizeValue(value));
    if (availability.length) {
      mainY = drawMainSection(document, "Availability", mainY + 4, ensureMainSpace);
      availability.forEach(([label, value]) => {
        ensureMainSpace(25);
        document.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.muted).text(label.toUpperCase(), MAIN.x, mainY, {
          width: 112,
          characterSpacing: 0.25,
          lineBreak: false,
        });
        const fitted = fitText(document, value, {
          font: "Helvetica",
          fontSize: 9.2,
          width: MAIN.width - 118,
          maxHeight: 24,
        });
        document.fillColor(COLORS.body).text(fitted.text, MAIN.x + 118, mainY, {
          width: MAIN.width - 118,
          height: 24,
        });
        mainY += Math.max(21, fitted.height + 5);
      });
    }

    document.end();
  });
}
