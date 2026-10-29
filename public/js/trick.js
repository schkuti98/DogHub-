// required.all: alle müssen gelernt sein. required.any: einer davon reicht.
const tricks = {
   sitz: {
      name: 'Sitz',
      required: { all: [], any: [] },
      stufe: 'Grundgehorsam · Leicht',
      beschreibung: 'Dein Hund setzt sich auf dein Kommando hin.',
      schritte: [
         'Halte ein Leckerli vor die Nase deines Hundes.',
         'Führe es langsam etwas nach oben und hinten, bis er sich setzt.',
         'Belohne ihn direkt. Ergänze das Wort „Sitz“, sobald die Bewegung zuverlässig klappt.'
      ]
   },
   platz: {
      name: 'Platz',
      required: { all: [], any: [] },
      stufe: 'Grundgehorsam · Leicht',
      beschreibung: 'Dein Hund legt sich auf dein Kommando hin.',
      schritte: [
         'Halte ein Leckerli vor die Nase deines Hundes.',
         'Führe es langsam zum Boden. Belohne ihn, wenn er sich hinlegt.',
         'Wenn das gut klappt, ergänze das Wort „Platz“. Drücke ihn nicht nach unten.'
      ]
   },
   bleib: {
      name: 'Bleib',
      required: { all: [], any: ['sitz', 'platz'] },
      stufe: 'Grundgehorsam · Mittel',
      beschreibung: 'Dein Hund bleibt sitzen oder liegen, bis du ihn freigibst.',
      schritte: [
         'Lass deinen Hund Sitz oder Platz machen und sage „Bleib“.',
         'Warte kurz, belohne ihn in dieser Position und gib ihn mit einem festen Wort wie „Okay“ frei.',
         'Verlängere zuerst die Zeit in kleinen Schritten. Übe Abstand erst danach. Steht er auf, starte wieder leichter.'
      ]
   },
   pfote: {
      name: 'Pfote geben',
      required: { all: ['sitz', 'bleib'], any: [] },
      stufe: 'Tricks · Mittel',
      beschreibung: 'Dein Hund gibt dir im Sitzen eine Vorderpfote.',
      schritte: [
         'Lass deinen Hund sitzen und halte ihm deine Hand hin.',
         'Belohne ihn, sobald er eine Vorderpfote anhebt oder deine Hand berührt. Ziehe nicht an seiner Pfote.',
         'Übe in kleinen Schritten und ergänze das Wort „Pfote“, wenn es klappt.'
      ]
   },
   totstellen: {
      name: 'Totstellen',
      required: { all: ['platz', 'bleib'], any: [] },
      stufe: 'Tricks · Mittel',
      beschreibung: 'Dein Hund legt sich auf die Seite und bleibt kurz liegen.',
      schritte: [
         'Lass deinen Hund auf einer weichen, rutschfesten Fläche Platz machen.',
         'Führe ein Leckerli langsam seitlich zur Schulter, bis er sich entspannt auf die Seite legt. Erzwinge die Bewegung nicht.',
         'Belohne ihn und verlängere die Zeit langsam. Ergänze dein Kommando und gib ihn danach wieder frei.'
      ]
   },
   rolle: {
      name: 'Rolle',
      required: { all: ['platz'], any: [] },
      stufe: 'Tricks · Mittel',
      beschreibung: 'Dein Hund rollt sich aus dem Liegen einmal um die eigene Achse.',
      schritte: [
         'Übe auf einer weichen, rutschfesten Fläche und lass deinen Hund entspannt Platz machen.',
         'Führe ein Leckerli von seiner Nase seitlich Richtung Schulter, sodass er sich auf die Seite legt.',
         'Belohne kleine Schritte und führe ihn nach und nach in eine ganze Rolle. Erzwinge die Bewegung nicht.'
      ]
   },
   'criss-cross': {
      name: 'Criss Cross',
      required: { all: ['platz', 'bleib'], any: [] },
      stufe: 'Tricks · Schwer',
      beschreibung: 'Dein Hund kreuzt im Liegen seine Vorderpfoten.',
      schritte: [
         'Übe zuerst, dass dein Hund im Liegen mit einer Vorderpfote deine Hand berührt.',
         'Halte deine Hand schrittweise weiter in Richtung der anderen Vorderpfote.',
         'Belohne das Überkreuzen und ergänze später dein Kommando „Criss Cross“.'
      ]
   }
};

function formatRequiredTricks(trick) {
   const allReq = trick?.required?.all ?? [];
   const anyReq = trick?.required?.any ?? [];

   if (allReq.length === 0 && anyReq.length === 0) {
      return 'Keine';
   }

   const allNames = allReq.map((id) => tricks[id]?.name || id);
   const anyNames = anyReq.map((id) => tricks[id]?.name || id);
   const parts = [];

   if (allNames.length > 0) {
      parts.push(allNames.join(' und '));
   }

   if (anyNames.length > 0) {
      parts.push(anyNames.join(' oder '));
   }

   return parts.join(' + ');
}
