const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPayload } = require("../src/transform");

for (const [source, expected] of [
  ["Sukkot", "Succos"],
  ["Sukkot I", "Succos I"],
  ["Sukkot II", "Succos II"],
  ["Sukkot III (CH''M)", "Succos III (CH''M)"],
  ["Sukkot VII (Hoshana Raba)", "Succos VII (Hoshana Raba)"],
  ["Shabbat Chol ha-Moed Sukkot", "Shabbos Chol HaMoed Succos"],
  ["Succos I", "Succos I"]
]) {
  for (const category of ["holiday", "parashat"]) {
    for (const field of ["title_orig", "title", "memo"]) {
      test(`${category} ${field} normalizes ${source}`, () => {
        const result = buildPayload(fixture([{
          category, date: "2026-09-12", [field]: source,
          leyning: { torah: "A special reading" }
        }]), { now: "2026-09-06T10:00:00-05:00" });
        assert.equal(result.parasha, expected);
      });
    }
  }
}

function fixture(calendarItems) {
  return {
    IDX_0: {
      location: { title: "Milwaukee, WI 53216" },
      times: {
        sunrise: "2026-09-06T06:23:00-05:00",
        chatzot: "2026-09-06T12:51:00-05:00",
        sunset: "2026-09-06T19:20:00-05:00"
      }
    },
    IDX_1: {
      items: [
        { category: "hebdate", date: "2026-09-06", hdate: "24 Elul 5786" },
        ...calendarItems
      ]
    }
  };
}

test("shows a major-holiday Torah reading when no weekly parasha is scheduled", () => {
  const result = buildPayload(fixture([
    {
      category: "holiday",
      date: "2026-09-12",
      title: "Rosh Hashana 5787",
      leyning: { torah: "Genesis 21:1-34; Numbers 29:1-6" }
    }
  ]), { now: "2026-09-06T10:00:00-05:00" });

  assert.equal(result.parasha, "Rosh Hashanah");
});

test("prefers the weekly parasha when Hebcal provides one", () => {
  const result = buildPayload(fixture([
    {
      category: "holiday",
      date: "2026-09-12",
      title: "A Holiday",
      leyning: { torah: "A special reading" }
    },
    {
      category: "parashat",
      date: "2026-09-12",
      title_orig: "Parashat Sh'lach"
    }
  ]), { now: "2026-09-06T10:00:00-05:00" });

  assert.equal(result.parasha, "Shelach");
});
