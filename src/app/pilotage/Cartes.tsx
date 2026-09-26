import { CARTE, projeter } from "@/domain/carte-benin";
import { ZONES_SANITAIRES } from "@/domain/geographie";
import { agreger, lireIndicateur, type CodeIndicateur, type Lecture, type Niveau, type Valeurs } from "@/domain/pilotage";

type Boite = [number, number, number, number];

const MOTS: Record<Niveau, string> = { bon: "objectif atteint", moyen: "presque", faible: "à appuyer" };

/** Remplissage selon le niveau : les couleurs de la charte, doublées d'un mot dans la légende et les étiquettes. */
function remplissage(lecture: Lecture | null, motif: string): string {
  if (!lecture || (lecture.valeur === null && !lecture.masque)) return "var(--color-lavande-2)";
  if (lecture.masque) return `url(#${motif})`;
  if (lecture.niveau === "bon") return "var(--color-marque)";
  if (lecture.niveau === "moyen") return "var(--color-soleil)";
  if (lecture.niveau === "faible") return "var(--color-urgence)";
  return "var(--color-lavande-4)";
}

/** « Bohicon : 61 %, objectif atteint » : ce que dit la carte, en mots. */
export function decrire(nom: string, lecture: Lecture | null): string {
  if (!lecture || (lecture.valeur === null && !lecture.masque)) return `${nom} : pas de donnée`;
  if (lecture.masque) return `${nom} : masqué (moins de 5 personnes)`;
  return lecture.niveau ? `${nom} : ${lecture.texte}, ${MOTS[lecture.niveau]}` : `${nom} : ${lecture.texte}`;
}

const valeurCourte = (lecture: Lecture | null) => (!lecture || (lecture.valeur === null && !lecture.masque) ? "—" : lecture.masque ? "masqué" : lecture.texte);

function Hachures({ id }: { id: string }) {
  return (
    <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="var(--color-lavande-3)" />
      <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-lavande-5)" strokeWidth="1.6" />
    </pattern>
  );
}

/** Texte foncé cerné de blanc : lisible sur toutes les couleurs de la carte, même quand il déborde de sa commune. */
function Etiquette({ x, y, lignes, taille, attenue = false }: { x: number; y: number; lignes: { texte: string; gras?: boolean }[]; taille: number; attenue?: boolean }) {
  return (
    <text
      x={x}
      y={y - ((lignes.length - 1) * taille * 1.1) / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={taille}
      fill={attenue ? "var(--color-gris)" : "var(--color-nuit)"}
      stroke="#fff"
      strokeWidth={taille * 0.3}
      strokeLinejoin="round"
      paintOrder="stroke"
      aria-hidden="true"
      className="pointer-events-none"
    >
      {lignes.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : taille * 1.15} fontWeight={l.gras === false ? 500 : 700}>
          {l.texte}
        </tspan>
      ))}
    </text>
  );
}

export function LegendeCarte({ id, sansObjectif = false }: { id: string; sansObjectif?: boolean }) {
  const cases: { mot: string; fill: string }[] = [
    ...(sansObjectif
      ? [{ mot: "Valeur du mois", fill: "var(--color-lavande-4)" }]
      : [
          { mot: "Objectif atteint", fill: "var(--color-marque)" },
          { mot: "Presque", fill: "var(--color-soleil)" },
          { mot: "À appuyer", fill: "var(--color-urgence)" },
        ]),
    { mot: "Masqué", fill: `url(#${id})` },
    { mot: "Pas de donnée", fill: "var(--color-lavande-2)" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gris">
      {cases.map((c) => (
        <li key={c.mot} className="flex items-center gap-1.5">
          <svg viewBox="0 0 12 12" className="size-3.5" aria-hidden="true">
            <defs>
              <Hachures id={id} />
            </defs>
            <rect width="12" height="12" rx="3" fill={c.fill} />
          </svg>
          {c.mot}
        </li>
      ))}
    </ul>
  );
}

const sansObjectif = (code: CodeIndicateur) => lireIndicateur(code, { numerateur: 1, denominateur: 10 }).niveau === null;

const DEPARTEMENTS_DU_SUD = ["Atlantique", "Littoral", "Ouémé", "Plateau", "Mono", "Couffo"];
const departementDe = new Map(ZONES_SANITAIRES.map((z) => [z.zone, z.departement]));

function union(boites: Boite[], marge: number): Boite {
  const b: Boite = [Math.min(...boites.map((x) => x[0])), Math.min(...boites.map((x) => x[1])), Math.max(...boites.map((x) => x[2])), Math.max(...boites.map((x) => x[3]))];
  const mx = (b[2] - b[0]) * marge;
  const my = (b[3] - b[1]) * marge;
  return [b[0] - mx, b[1] - my, b[2] + mx, b[3] + my];
}

const BOITE_SUD = union(
  CARTE.zones.filter((z) => DEPARTEMENTS_DU_SUD.includes(departementDe.get(z.membres[0]!) ?? "")).map((z) => z.boite),
  0.04,
);
const coupe = (b: Boite, [x0, y0, x1, y1]: Boite) => b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0;

interface ZoneVue {
  zone: string;
  departement: string;
  valeurs: Valeurs;
  direct: boolean;
}

/** Une vue de la carte nationale (le pays entier, ou le Sud en grand) : chaque zone est un lien vers sa fiche. */
function VueNationale(p: {
  code: CodeIndicateur;
  zones: ZoneVue[];
  lien: (zone: string) => string;
  boite: Boite;
  seuilEtiquette: number;
  taille: number;
  motif: string;
  cadreSud: boolean;
  className: string;
  titre: string;
  /** Vue agrandie : doublon visuel de la carte entière, hors de la navigation au clavier et du lecteur d'écran. */
  agrandie?: boolean;
}) {
  const parNom = new Map(p.zones.map((z) => [z.zone, z]));
  const communeDe = new Map(CARTE.communes.map((c) => [c.nom, c]));
  const [x0, y0, x1, y1] = p.boite;
  const lectureDe = (membres: string[]) => {
    const vues = membres.map((m) => parNom.get(m)).filter((m): m is ZoneVue => Boolean(m));
    return vues.length ? lireIndicateur(p.code, agreger(vues.map((m) => m.valeurs))[p.code]) : null;
  };
  const visibles = CARTE.zones.filter((g) => coupe(g.boite, p.boite));
  return (
    <svg
      viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
      role={p.agrandie ? undefined : "group"}
      aria-label={p.agrandie ? undefined : p.titre}
      aria-hidden={p.agrandie || undefined}
      className={p.className}
    >
      <defs>
        <Hachures id={p.motif} />
      </defs>
      {visibles.map((g, rang) => {
        const lecture = lectureDe(g.membres);
        const nom = g.membres.length > 1 ? `${g.zone} (${g.membres.length} zones sanitaires)` : g.zone;
        const fill = remplissage(lecture, p.motif);
        return (
          <a
            key={g.zone}
            href={g.membres.length > 1 ? "/pilotage/zones" : p.lien(g.zone)}
            aria-label={decrire(nom, lecture)}
            tabIndex={p.agrandie ? -1 : undefined}
            className="group animate-surgir outline-none [transform-box:fill-box] origin-center"
            style={{ animationDelay: `${120 + rang * 45}ms` }}
          >
            <title>{decrire(nom, lecture)}</title>
            {g.communes.map((c) => (
              <path
                key={c}
                d={communeDe.get(c)!.d}
                fill={fill}
                stroke={fill}
                strokeWidth={0.3}
                vectorEffect="non-scaling-stroke"
                className="transition-opacity group-hover:opacity-80 group-focus-visible:stroke-nuit group-focus-visible:[stroke-width:3px]"
              />
            ))}
          </a>
        );
      })}
      <path d={CARTE.frontieresZones} fill="none" stroke="#fff" strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents="none" />
      <path
        d={CARTE.frontieresDepartements}
        fill="none"
        stroke="var(--color-nuit)"
        strokeOpacity={0.55}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        pointerEvents="none"
      />
      <path d={CARTE.contour} fill="none" stroke="var(--color-nuit)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents="none" />
      {p.cadreSud && (
        <rect
          x={BOITE_SUD[0]}
          y={BOITE_SUD[1]}
          width={BOITE_SUD[2] - BOITE_SUD[0]}
          height={BOITE_SUD[3] - BOITE_SUD[1]}
          fill="none"
          stroke="var(--color-nuit)"
          strokeDasharray="4 3"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {visibles
        .filter((g) => g.aire >= p.seuilEtiquette && g.centre[0] >= x0 && g.centre[0] <= x1 && g.centre[1] >= y0 && g.centre[1] <= y1)
        .map((g) => (
          <Etiquette key={g.zone} x={g.centre[0]} y={g.centre[1]} lignes={[{ texte: valeurCourte(lectureDe(g.membres)) }]} taille={p.taille} />
        ))}
    </svg>
  );
}

/** Le pays, zone par zone, pour un indicateur ; le Sud, où les zones sont petites, est agrandi à côté. */
export function CarteNationale({ code, zones, lien, titre }: { code: CodeIndicateur; zones: ZoneVue[]; lien: (zone: string) => string; titre: string }) {
  return (
    <figure className="flex flex-col gap-3 rounded-carte bg-white p-4">
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
        <VueNationale
          code={code}
          zones={zones}
          lien={lien}
          boite={[0, 0, CARTE.largeur, CARTE.hauteur]}
          seuilEtiquette={1400}
          taille={11}
          motif="hachures-pays"
          cadreSud
          className="h-auto w-full"
          titre={titre}
        />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-gris">Le Sud en grand</p>
          <VueNationale
            code={code}
            zones={zones}
            lien={lien}
            boite={BOITE_SUD}
            seuilEtiquette={120}
            taille={4.2}
            motif="hachures-sud"
            cadreSud={false}
            className="h-auto w-full rounded-2xl bg-lavande"
            titre={`${titre}, le Sud agrandi`}
            agrandie
          />
        </div>
      </div>
      <figcaption className="flex flex-col gap-2">
        <LegendeCarte id="hachures-legende-pays" sansObjectif={sansObjectif(code)} />
        <span className="text-xs text-gris">Chaque zone ouvre sa fiche. Les chiffres sont aussi dans le tableau des zones.</span>
      </figcaption>
    </figure>
  );
}

export interface LieuCarte {
  nom: string;
  type: "centre_sante" | "pharmacie";
  latitude: number;
  longitude: number;
}

/**
 * Une zone sanitaire et ses voisines : chaque commune de la zone avec sa valeur (ou la valeur de la zone entière),
 * et les établissements en points. Sans indicateur, la zone est simplement mise en avant.
 */
export function CarteZone({
  zone,
  code,
  communes,
  valeurZone,
  lieux = [],
  titre,
}: {
  zone: string;
  code?: CodeIndicateur;
  communes?: { nom: string; valeurs: Valeurs }[];
  valeurZone?: Valeurs;
  lieux?: LieuCarte[];
  titre: string;
}) {
  const definition = ZONES_SANITAIRES.find((z) => z.zone === zone);
  if (!definition) return null;
  const noms = definition.communes.map((c) => c.nom);
  const traces = CARTE.communes.filter((c) => noms.includes(c.nom));
  const vue = union(
    traces.map((c) => c.boite),
    0.18,
  );
  const [x0, y0, x1, y1] = vue;
  const w = x1 - x0;
  const h = y1 - y0;
  const taille = Math.max(w, h) / 24;
  const voisines = CARTE.communes.filter((c) => !noms.includes(c.nom) && coupe(c.boite, vue));
  const motif = `hachures-${zone.replace(/[^a-z0-9]+/gi, "-")}`;
  const lectureDe = (nom: string): Lecture | null => {
    if (!code) return null;
    if (valeurZone) return lireIndicateur(code, valeurZone[code]);
    const v = communes?.find((c) => c.nom === nom)?.valeurs;
    return v ? lireIndicateur(code, v[code]) : null;
  };
  const lectureZone = code && valeurZone ? lireIndicateur(code, valeurZone[code]) : null;
  const dansLaVue = (pt: [number, number]) => pt[0] >= x0 && pt[0] <= x1 && pt[1] >= y0 && pt[1] <= y1;
  const points = lieux.map((l) => projeter(l.longitude, l.latitude));

  return (
    <figure className="flex flex-col gap-3 rounded-carte bg-white p-4">
      <svg viewBox={`${x0} ${y0} ${w} ${h}`} role="group" aria-label={titre} className="h-auto max-h-[28rem] w-full rounded-2xl bg-lavande">
        <defs>
          <Hachures id={motif} />
        </defs>
        {voisines.map((c) => (
          <path key={c.nom} d={c.d} fill="#fff" stroke="var(--color-lavande-3)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {traces.map((c, rang) => {
          const lecture = lectureDe(c.nom);
          return (
            <path
              key={c.nom}
              className="animate-surgir [transform-box:fill-box] origin-center"
              style={{ animationDelay: `${150 + rang * 220}ms` }}
              d={c.d}
              fill={code ? remplissage(lecture, motif) : "var(--color-lavande-3)"}
              stroke="#fff"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            >
              <title>{code ? decrire(c.nom, lecture) : c.nom}</title>
            </path>
          );
        })}
        {voisines
          .filter((c) => dansLaVue(c.centre))
          .map((c) => (
            <Etiquette key={c.nom} x={c.centre[0]} y={c.centre[1]} lignes={[{ texte: c.nom, gras: false }]} taille={taille * 0.7} attenue />
          ))}
        {traces.map((c) => {
          const lecture = lectureDe(c.nom);
          const lignes = code && !valeurZone ? [{ texte: c.nom }, { texte: valeurCourte(lecture), gras: false }] : [{ texte: c.nom }];
          // Un établissement sur l'étiquette : l'étiquette descend d'un cran.
          const gene = points.some(([x, y]) => Math.abs(x - c.centre[0]) < taille * 2.5 && Math.abs(y - c.centre[1]) < taille * 1.6);
          return <Etiquette key={c.nom} x={c.centre[0]} y={c.centre[1] + (gene ? taille * 1.9 : 0)} lignes={lignes} taille={taille} />;
        })}
        {lieux.map((l, i) => (
          <circle
            key={l.nom}
            cx={points[i]![0]}
            cy={points[i]![1]}
            r={taille * 0.32}
            fill={l.type === "pharmacie" ? "var(--color-soleil)" : "var(--color-nuit)"}
            stroke="#fff"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${l.type === "pharmacie" ? "Pharmacie" : "Centre de santé"} : ${l.nom}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="flex flex-col gap-2">
        {lectureZone && <b className="text-sm">{decrire(zone, lectureZone)}</b>}
        {code && <LegendeCarte id={`${motif}-legende`} sansObjectif={sansObjectif(code)} />}
        {lieux.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gris">
            {lieux.map((l) => (
              <li key={l.nom} className="flex items-center gap-1.5">
                <i className={`size-3 rounded-full ${l.type === "pharmacie" ? "bg-soleil" : "bg-nuit"}`} />
                {l.nom}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  );
}
