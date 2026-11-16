// Tio påhittade demolag. Används när DEMO är true i config.js, och då behövs ingen databas.
// "days" är antal dagar kvar räknat från idag, så att demon aldrig blir inaktuell.
const DEMO_ROWS = [
  {
    "slug": "demo-ekeby-knatte",
    "team": "Knattefotbollen",
    "title": "Konstgräs på minifotbollsplanen",
    "description": "Grusplanen blir lera varje höst. Med konstgräs kan 200 barn spela året runt. Kommunen står för halva kostnaden.",
    "target": 250000,
    "days": 229,
    "swish_message": "Knatte Konstgras",
    "kak_thing": null,
    "kak_items": null,
    "kak_profit": null,
    "update_text": "Kommunen har godkänt ansökan om medfinansiering.",
    "confirmed": 92000,
    "supporters": 287,
    "club": {
      "name": "Ekeby United",
      "crest": "EU",
      "color": "#232323",
      "city": "Sundbyberg",
      "lat": 59.361,
      "lng": 17.971
    }
  },
  {
    "slug": "demo-hamnens-p15",
    "team": "P15",
    "title": "Träningsläger i Danmark",
    "description": "Fyra dagar med två träningspass om dagen och matcher mot danska lag. Pengarna går till buss, färja och boende.",
    "target": 40000,
    "days": 89,
    "swish_message": "P15 Danmark",
    "kak_thing": "Bingolotter",
    "kak_items": 10,
    "kak_profit": 60,
    "update_text": "Lägret är bokat till sportlovet.",
    "confirmed": 21000,
    "supporters": 73,
    "club": {
      "name": "Hamnens BK",
      "crest": "HBK",
      "color": "#0a4f8a",
      "city": "Göteborg",
      "lat": 57.708,
      "lng": 11.974
    }
  },
  {
    "slug": "demo-kustbyns-p12",
    "team": "P12",
    "title": "Målvaktsutrustning",
    "description": "Tre målvakter delar på ett par handskar. Nya handskar, tröjor och byxor med skydd till alla som vill stå i mål.",
    "target": 8000,
    "days": 29,
    "swish_message": "P12 Malvakt",
    "kak_thing": null,
    "kak_items": null,
    "kak_profit": null,
    "update_text": "Handskarna är beställda, nu fattas tröjorna.",
    "confirmed": 6900,
    "supporters": 58,
    "club": {
      "name": "Kustbyns FF",
      "crest": "KFF",
      "color": "#0b7fb3",
      "city": "Malmö",
      "lat": 55.605,
      "lng": 13.003
    }
  },
  {
    "slug": "demo-kvarnbyns-f12",
    "team": "F12",
    "title": "Nya matchställ till hela laget",
    "description": "Laget har vuxit från 11 till 22 spelare och tröjorna räcker inte. Målet är matchställ i alla storlekar.",
    "target": 18000,
    "days": 34,
    "swish_message": "F12 Matchstall",
    "kak_thing": "Bingolotter",
    "kak_items": 5,
    "kak_profit": 60,
    "update_text": "Vi provade storlekar på träningen i tisdags.",
    "confirmed": 11250,
    "supporters": 64,
    "club": {
      "name": "Kvarnbyns BK",
      "crest": "KBK",
      "color": "#b3202a",
      "city": "Nacka",
      "lat": 59.31,
      "lng": 18.163
    }
  },
  {
    "slug": "demo-lindhagens-f16",
    "team": "F16",
    "title": "Gothia Cup i Göteborg",
    "description": "Laget har aldrig spelat en stor turnering. Pengarna täcker anmälan, tåg och skolförläggning för 16 spelare.",
    "target": 45000,
    "days": 189,
    "swish_message": "F16 Gothia",
    "kak_thing": "kakburkar",
    "kak_items": 15,
    "kak_profit": 50,
    "update_text": "Anmälan är skickad. Nu samlar vi till resan.",
    "confirmed": 12600,
    "supporters": 38,
    "club": {
      "name": "Lindhagens IK",
      "crest": "LIK",
      "color": "#5a2d82",
      "city": "Solna",
      "lat": 59.36,
      "lng": 18
    }
  },
  {
    "slug": "demo-norrtorps-dam",
    "team": "Damlaget",
    "title": "Buss till bortamatcherna",
    "description": "Spelarna kör egna bilar till bortamatcher upp till 15 mil bort. En hyrd buss gör resorna säkrare och billigare.",
    "target": 32000,
    "days": 139,
    "swish_message": "Dam Buss",
    "kak_thing": null,
    "kak_items": null,
    "kak_profit": null,
    "update_text": "Spelarna har startat en loppis i klubbstugan.",
    "confirmed": 8000,
    "supporters": 27,
    "club": {
      "name": "Norrtorps DFF",
      "crest": "NDF",
      "color": "#c94f0c",
      "city": "Uppsala",
      "lat": 59.858,
      "lng": 17.639
    }
  },
  {
    "slug": "demo-skogsby-f13",
    "team": "F13",
    "title": "Inomhustider i vinter",
    "description": "Vintern är lång i Umeå. Hyra av inomhushall varannan helg i fyra månader gör att laget kan fortsätta träna.",
    "target": 15000,
    "days": 44,
    "swish_message": "F13 Inomhus",
    "kak_thing": null,
    "kak_items": null,
    "kak_profit": null,
    "update_text": "Hallen är preliminärbokad från december.",
    "confirmed": 3200,
    "supporters": 22,
    "club": {
      "name": "Skogsby IF",
      "crest": "SKI",
      "color": "#2e5e2a",
      "city": "Umeå",
      "lat": 63.826,
      "lng": 20.263
    }
  },
  {
    "slug": "demo-solbacka-p14",
    "team": "P14",
    "title": "Cupresa till Barcelona",
    "description": "18 spelare vill åka på Costa Brava Cup i påsk. Pengarna går till flyg och boende så att alla kan följa med, oavsett hemekonomi.",
    "target": 60000,
    "days": 119,
    "swish_message": "P14 Barcelona",
    "kak_thing": "kakburkar",
    "kak_items": 20,
    "kak_profit": 50,
    "update_text": "Vi har sålt 340 kakburkar hittills. Tack alla som köpt!",
    "confirmed": 38400,
    "supporters": 112,
    "club": {
      "name": "Solbacka IF",
      "crest": "SIF",
      "color": "#1d4e9e",
      "city": "Stockholm",
      "lat": 59.312,
      "lng": 18.072
    }
  },
  {
    "slug": "demo-strandvikens-p10",
    "team": "P10",
    "title": "Bollar och koner till träningarna",
    "description": "Vi tränar 30 barn med 8 bollar. 25 nya bollar i storlek 4 och en uppsättning koner gör varje träning bättre.",
    "target": 6000,
    "days": 14,
    "swish_message": "P10 Bollar",
    "kak_thing": null,
    "kak_items": null,
    "kak_profit": null,
    "update_text": "Bara 1 100 kr kvar till målet.",
    "confirmed": 4900,
    "supporters": 41,
    "club": {
      "name": "Strandvikens FF",
      "crest": "SFF",
      "color": "#0f7a6c",
      "city": "Stockholm",
      "lat": 59.325,
      "lng": 18.095
    }
  },
  {
    "slug": "demo-vasterangens-sommar",
    "team": "Sommarskolan",
    "title": "Fotbollsskola för alla barn",
    "description": "Vi vill att sommarens fotbollsskola ska kosta 0 kr för familjer som inte har råd. 25 000 kr täcker 50 platser.",
    "target": 25000,
    "days": 164,
    "swish_message": "Sommarskola",
    "kak_thing": null,
    "kak_items": null,
    "kak_profit": null,
    "update_text": "35 platser är redan finansierade.",
    "confirmed": 17500,
    "supporters": 96,
    "club": {
      "name": "Västerängens IF",
      "crest": "VIF",
      "color": "#2f7d32",
      "city": "Huddinge",
      "lat": 59.236,
      "lng": 17.982
    }
  }
];

export function demoGoals() {
  const today = new Date();
  return DEMO_ROWS.map((r, i) => {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + r.days);
    const deadline = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    return {
      ...r, id: 'demo-' + i, deadline, published: true,
      clubs: { ...r.club, demo: true },
      t: { confirmed: r.confirmed, supporters: r.supporters },
    };
  });
}
