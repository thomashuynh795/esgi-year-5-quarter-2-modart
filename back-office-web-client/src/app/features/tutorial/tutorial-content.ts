export interface TutorialActionLink {
  label: string;
  path: string;
}

export interface TutorialStepContent {
  id: number;
  title: string;
  why: string;
  actions: TutorialActionLink[];
  expected: string;
  note?: string;
}

export const tutorialOverviewBlocks = [
  {
    title: 'Probleme',
    body: 'La contrefacon existe, un simple tag NFC copiable ne suffit pas.',
  },
  {
    title: 'Idee',
    body: "Chaque scan envoie un message a l'API, qui verifie une preuve cryptographique.",
  },
  {
    title: 'Anti-rejeu',
    body: 'Un meme message scanne deux fois est detecte et refuse.',
  },
  {
    title: 'Resultat',
    body: 'La console permet de gerer les vetements, les tags, et de visualiser les scans.',
  },
] as const;

export const tutorialSteps: TutorialStepContent[] = [
  {
    id: 1,
    title: 'Etape 1 — Contexte et objectif',
    why: "On presente Cyprien, la marque (USE)LESS, et le besoin de prouver qu'un vetement est bien authentique lors d'un scan.",
    actions: [{ label: "Ouvrir la vue d'ensemble", path: '/tutorial' }],
    expected: 'Le public comprend le probleme de la contrefacon et le role de la plateforme.',
    note: "A dire a l'oral : le tag seul ne suffit pas, c'est la verification cote serveur qui apporte la confiance.",
  },
  {
    id: 2,
    title: 'Etape 2 — Creer un vetement',
    why: "Un vetement doit exister dans le systeme avant d'etre rattache a un tag physique.",
    actions: [
      { label: 'Voir les vetements', path: '/admin/catalog' },
      { label: 'Creer un vetement', path: '/admin/enroll' },
    ],
    expected: 'On doit voir un nouveau vetement apparaitre dans la liste du catalogue.',
    note: "A dire a l'oral : ici on cree la fiche metier du vetement, avec sa reference, sa taille et sa couleur.",
  },
  {
    id: 3,
    title: 'Etape 3 — Enroler / enregistrer un tag NFC',
    why: 'On introduit le support physique : le tag NFC devient un tag connu par la plateforme.',
    actions: [
      { label: 'Voir les tags NFC', path: '/admin/catalog' },
      { label: 'Enroler un tag', path: '/admin/enroll' },
    ],
    expected: 'On doit voir le tag dans la liste avec un identifiant, un mode, et un statut.',
    note: "A dire a l'oral : l'enrolement signifie que le serveur connait ce tag et peut verifier ses futurs messages.",
  },
  {
    id: 4,
    title: 'Etape 4 — Associer vetement et tag',
    why: "On relie l'objet metier, le vetement, a l'objet physique, le tag NFC qui sera scanne.",
    actions: [
      { label: 'Ouvrir le catalogue', path: '/admin/catalog' },
      { label: 'Associer via la creation', path: '/admin/enroll' },
    ],
    expected: 'Le vetement affiche le tag associe, et le tag affiche le vetement associe.',
    note: "A dire a l'oral : dans cette demo, l'association se fait pendant la creation du vetement et de son tag.",
  },
  {
    id: 5,
    title: 'Etape 5 — Expliquer le message NFC (payload)',
    why: "On montre ce qu'un telephone lit vraiment : un identifiant, un compteur et une preuve cryptographique.",
    actions: [
      { label: 'Voir des preuves generees', path: '/admin/next-messages' },
      { label: 'Voir un scan client', path: '/public/scan' },
    ],
    expected: 'Le public voit un exemple de payload et comprend le role de chaque champ.',
    note: "A dire a l'oral : le compteur change a chaque lecture, et la preuve depend de ce compteur. Cela evite le simple copier-coller.",
  },
  {
    id: 6,
    title: 'Etape 6 — Verifier un scan',
    why: "Chaque scan declenche une verification cote API pour confirmer que le message vient d'un tag attendu.",
    actions: [
      { label: 'Generer une preuve', path: '/admin/next-messages' },
      { label: 'Verifier un scan', path: '/public/verify' },
    ],
    expected: 'On doit voir un verdict authentique avec le tag reconnu et le compteur accepte.',
    note: "A dire a l'oral : le serveur ne valide pas un simple identifiant, il valide une preuve calculee avec une cle secrete.",
  },
  {
    id: 7,
    title: 'Etape 7 — Demontrer l anti-rejeu (replay)',
    why: "On prouve qu'un copié-collé du meme message ne doit pas marcher une deuxieme fois.",
    actions: [
      { label: 'Ouvrir la verification', path: '/public/verify' },
      { label: 'Rejouer la meme requete', path: '/public/verify' },
    ],
    expected: 'On doit voir un refus clair du type replay detecte ou message deja utilise.',
    note: "A dire a l'oral : meme si quelqu'un copie l'URL ou le payload, le serveur detecte qu'il a deja ete utilise.",
  },
  {
    id: 8,
    title: 'Etape 8 — Gestion admin des cles',
    why: "La cle secrete sert a produire et valider la preuve. La cle admin sert a proteger les actions sensibles de la console.",
    actions: [
      { label: 'Renouveler un secret', path: '/admin/rotate-key' },
      { label: "Changer le mode d'authentification", path: '/admin/reconfigure-tag' },
      { label: 'Ouvrir les parametres admin', path: '/settings' },
    ],
    expected: "Le public comprend pourquoi on fait des rotations, pourquoi il existe une cle admin, et pourquoi la securite ne repose pas sur le tag seul.",
    note: "A dire a l'oral : on tourne les cles pour limiter l'impact d'une fuite, et la cle admin n'est ici qu'une simplification de demo.",
  },
];

export const tutorialGlossary = [
  {
    title: 'Tag NFC',
    body: "Petit support physique lu par un telephone ou un lecteur compatible.",
  },
  {
    title: 'Payload / URL de scan',
    body: "Message lu depuis le tag, puis envoye a l'API pour verification.",
  },
  {
    title: 'Preuve cryptographique (HMAC/CMAC)',
    body: 'Signature calculee avec une cle secrete pour prouver que le message est legitime.',
  },
  {
    title: 'Anti-rejeu (replay)',
    body: 'Mecanisme qui bloque la reutilisation du meme message une seconde fois.',
  },
  {
    title: 'Compteur / nonce',
    body: 'Valeur qui evolue a chaque lecture pour rendre chaque preuve unique.',
  },
  {
    title: 'Enrolement',
    body: "Moment ou l'on enregistre un tag dans le systeme pour qu'il devienne connu.",
  },
  {
    title: 'Cle admin (demo) vs securite reelle',
    body: "Dans cette demo la cle admin est simple. En production, on utiliserait un controle d'acces bien plus strict.",
  },
  {
    title: 'Limite du tag',
    body: "Un tag reinscriptible n'est pas un secure element. On compense donc avec la cryptographie et le controle serveur.",
  },
] as const;

export function getTutorialStep(stepId: number): TutorialStepContent | undefined {
  return tutorialSteps.find((step) => step.id === stepId);
}
