// TRMNL transform script for the Zmanim private plugin.
// Expected polling URLs:
// 1. https://www.hebcal.com/zmanim?cfg=json&sec=1&geonameid=5263045
// 2. https://www.hebcal.com/hebcal?v=1&cfg=json&zip=53216&d=on&s=on&c=on&M=on&lg=a
//
// The transform returns the same payload shape the old Flask /api/zmanim
// endpoint returned, so the existing Liquid templates can keep reading IDX_0.

function transform(input) {
  return buildPayload(input);
}

function run(input) {
  return buildPayload(input);
}

function buildPayload(input) {
  const TZID = "America/Chicago";

  const PARASHA_MAP = {
    "Achrei Mot": "Acharei Mos",
    "Achrei Mot-Kedoshim": "Acharei Mos-Kedoshim",
    "Balak": "Balak",
    "Bamidbar": "Bamidbar",
    "Bechukotai": "Bechukosai",
    "Beha'alotcha": "Beha'aloscha",
    "Beha\u2019aloscha": "Beha'aloscha",
    "Beha\u2019alotcha": "Beha'aloscha",
    "Beha'aloscha": "Beha'aloscha",
    "Behar": "Behar",
    "Bereshit": "Bereishis",
    "Beshalach": "Beshalach",
    "Bo": "Bo",
    "Chayei Sara": "Chayei Sarah",
    "Chayei Sarahh": "Chayei Sarah",
    "Chukat": "Chukas",
    "Chukat-Balak": "Chukas-Balak",
    "Devarim": "Devarim",
    "Eikev": "Eikev",
    "Emor": "Emor",
    "ha-Moed": "HaMoed",
    "Ha'azinu": "Ha'azinu",
    "Ha\u2019azinu": "Ha'azinu",
    "Haazinu": "Ha'azinu",
    "Kedoshim": "Kedoshim",
    "Ki Tavo": "Ki Savo",
    "Ki Teitzei": "Ki Seitzei",
    "Ki Tisa": "Ki Sisa",
    "Korach": "Korach",
    "Lech-Lecha": "Lech Lecha",
    "Masei": "Masei",
    "Matot": "Matos",
    "Matot-Masei": "Matos-Masei",
    "Metzora": "Metzora",
    "Miketz": "Mikeitz",
    "Mishpatim": "Mishpatim",
    "Naso": "Nasso",
    "Nitzavim": "Nitzavim",
    "Nitzavim-Vayeilech": "Nitzavim-Vayeilech",
    "Noach": "Noach",
    "Pekudei": "Pekudei",
    "Pinchas": "Pinchas",
    "Re\u2019eh": "Re'eh",
    "Shabbat": "Shabbos",
    "Shemot": "Shemos",
    "Sh'lach": "Shelach",
    "Sh\u2019lach": "Shelach",
    "Shmini": "Shemini",
    "Shoftim": "Shoftim",
    "Tazria": "Tazria",
    "Tazria-Metzora": "Tazria-Metzora",
    "Terumah": "Terumah",
    "Tetzaveh": "Tetzaveh",
    "Toldot": "Toldos",
    "Tzav": "Tzav",
    "Vaetchanan": "Va'eschanan",
    "Vayakhel": "Vayakhel",
    "Vayakhel-Pekudei": "Vayakhel-Pekudei",
    "Vayechi": "Vayechi",
    "Vayeilech": "Vayeilech",
    "Vayera": "Vayeira",
    "Vaera": "Va'eira",
    "Vayeshev": "Vayeishev",
    "Vayetzei": "Vayeitzei",
    "Vayigash": "Vayigash",
    "Vayikra": "Vayikra",
    "Vayishlach": "Vayishlach",
    "Yitro": "Yisro",
    "Vezot Haberakhah": "Vezos Haberachah",
    "V'Zos Habracha": "Vezos Haberachah"
  };

  function candidates(value) {
    if (!value) return new Array();
    if (Array.isArray(value)) return value;

    const found = [value];
    for (const key of ["IDX_0", "IDX_1", "idx_0", "idx_1", "data", "body", "response"]) {
      if (value[key]) found.push(value[key]);
    }
    if (value.data && typeof value.data === "object") {
      found.push(...candidates(value.data));
    }
    return found;
  }

  const inputs = candidates(input);
  const zmanimData = inputs.find((item) => item && item.times && !Array.isArray(item.times));
  const calendarData = inputs.find((item) => item && Array.isArray(item.items));

  // During editor previews TRMNL may hand the transform the previous already
  // transformed payload. Keep the screen alive instead of throwing.
  if (!zmanimData && input && input.period && Array.isArray(input.times)) {
    return input;
  }

  if (!zmanimData) {
    return { error: "Missing Hebcal zmanim polling data" };
  }

  const now = new Date();
  const today = formatDateParam(now);
  const todayWeekday = weekday(now);
  const times = parseTimes(zmanimData.times);
  const hdate = findHebrewDate(calendarData, today);
  const parasha = findUpcomingParasha(calendarData, now, todayWeekday);

  return buildCurrentPeriodPayload({
    now,
    todayWeekday,
    times,
    hdate,
    parasha,
    location: (zmanimData.location && zmanimData.location.title) || "Milwaukee, Wisconsin, USA"
  });

  function formatDateParam(date) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: TZID,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date).map((part) => [part.type, part.value]));

    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function weekday(date) {
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: TZID,
      weekday: "short"
    }).format(date);

    return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[label];
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TZID,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  function formatDisplayDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TZID,
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  function parseTimes(rawTimes) {
    return Object.fromEntries(
      Object.entries(rawTimes || {}).map(([key, value]) => [key, value ? new Date(value) : null])
    );
  }

  function normalizeParashaName(name) {
    if (!name) return name;

    const cleaned = name
      .replace(/^Parashat\s+/i, "")
      .replace(/^Parshas\s+/i, "")
      .trim();
    const ascii = cleaned.replace(/\u2018|\u2019/g, "'");
    if (PARASHA_MAP[cleaned]) return PARASHA_MAP[cleaned];
    if (PARASHA_MAP[ascii]) return PARASHA_MAP[ascii];

    return Object.entries(PARASHA_MAP)
      .sort((a, b) => b[0].length - a[0].length)
      .reduce((result, [source, target]) => result.split(source).join(target), ascii);
  }

  function findHebrewDate(data, dateString) {
    const item = (data && data.items || []).find((entry) => {
      return entry.category === "hebdate" && entry.date === dateString;
    });

    return (item && item.hdate) || "Unknown";
  }

  function findUpcomingParasha(data, currentDate, currentWeekday) {
    const daysUntilSaturday = (6 - currentWeekday + 7) % 7;
    const shabbosDate = formatDateParam(addDays(currentDate, daysUntilSaturday));
    const item = (data && data.items || []).find((entry) => {
      return entry.category === "parashat" && entry.date === shabbosDate;
    });

    return normalizeParashaName(
      (item && (item.title_orig || item.title || item.memo)) || "Unknown"
    );
  }

  function isEarlyShabbosSeason(hdate) {
    if (!hdate || hdate === "Unknown") return false;

    const parts = hdate.split(/\s+/);
    const day = Number(parts[0]);
    const month = parts[1];

    if (!Number.isFinite(day) || !month) return false;
    if (month === "Nisan") return day >= 15;
    if (["Iyyar", "Sivan", "Tammuz", "Tamuz", "Av", "Elul"].includes(month)) return true;
    if (month === "Tishrei") return day < 15;
    return false;
  }

  function buildCurrentPeriodPayload({ now, todayWeekday, times, hdate, parasha, location }) {
    const sunrise = times.sunrise;
    const chatzot = times.chatzot;
    const sunset = times.sunset;
    const tzeit72min = times.tzeit72min;
    const alotHashachar = times.alotHaShachar;
    const misheyakirMachmir = times.misheyakirMachmir;
    const chatzotNight = times.chatzotNight;
    const plagHaMincha = times.plagHaMincha;

    if (!chatzot || !sunset) {
      return { error: "Missing critical times" };
    }

    let period = "Morning";
    let relevantTimes = [];

    if (chatzotNight && sunrise && now >= chatzotNight && now < sunrise) {
      period = "Early Morning";
      relevantTimes = [
        ["Midnight", chatzotNight],
        ["Dawn", alotHashachar],
        ["Earliest Daven", misheyakirMachmir],
        ["Sunrise", sunrise]
      ];
    } else if (sunrise && now >= sunrise && now < chatzot) {
      period = todayWeekday === 6 ? "Shabbos Morning" : "Morning";
      relevantTimes = [
        ["Shema (MGA)", times.sofZmanShmaMGA],
        ["Shema (Gra)", times.sofZmanShma],
        ["Tefilla (Gra)", times.sofZmanTfilla],
        ["Chatzos", chatzot]
      ];
    } else if (now >= chatzot && now < sunset) {
      period = todayWeekday === 5 ? "Erev Shabbos" : todayWeekday === 6 ? "Shabbos Afternoon" : "Afternoon";
      if (todayWeekday === 6) {
        relevantTimes = [
          ["Sunset", sunset],
          ["Maariv", addMinutes(sunset, 60)],
          ["Havdalah", tzeit72min]
        ];
      } else if (todayWeekday === 5) {
        const earlyShabbosSeason = isEarlyShabbosSeason(hdate);
        const candleLighting = earlyShabbosSeason && plagHaMincha
          ? addMinutes(plagHaMincha, 11)
          : addMinutes(sunset, -18);

        relevantTimes = [
          ["Plag HaMincha", plagHaMincha],
          ["Candle Lighting", candleLighting],
          ["Sunset", addMinutes(sunset, -1)]
        ];
      } else {
        relevantTimes = [
          ["Sunset", sunset]
        ];
      }
    } else if (todayWeekday === 6 && sunset && now >= sunset) {
      const havdalah = addMinutes(sunset, 73);
      if (now < havdalah) {
        period = "Shabbos Evening";
        relevantTimes = [
          ["Sunset", addMinutes(sunset, -1)],
          ["Maariv", addMinutes(sunset, 59)],
          ["Havdalah", havdalah]
        ];
      } else {
        period = "Motzei Shabbos";
        relevantTimes = [
          ["Havdalah", havdalah],
          ["Latest Maleve Malka", chatzotNight]
        ];
      }
    } else if (now >= sunset || (chatzotNight && now < chatzotNight)) {
      period = "Evening";
      relevantTimes = [
        ["Tzeis (72 min)", tzeit72min],
        ["Chatzos Night", chatzotNight]
      ];
    }

    return {
      period,
      current_time: formatClock(now),
      date: formatDisplayDate(now),
      hdate,
      parasha,
      times: relevantTimes
        .filter(([, time]) => Boolean(time))
        .map(([name, time]) => [name, typeof time === "string" ? time : formatClock(time)]),
      location
    };
  }
}
