// load-jspdf.js — charge jsPDF à la demande, uniquement quand un
// téléchargement PDF est réellement demandé. La librairie est servie
// depuis ce même site (vendor/jspdf.umd.min.js, v2.5.1) plutôt que depuis un
// CDN tiers : aucune dépendance réseau externe pour générer les PDF, et
// aucune réponse de l'utilisateur ne transite par ce chargement — seul le
// fichier de la librairie est récupéré.
'use strict';

let loading = null;

export function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('vendor/jspdf.umd.min.js', import.meta.url).href;
    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF introuvable après chargement.'));
    };
    script.onerror = () => reject(new Error('Impossible de charger la librairie PDF (jsPDF).'));
    document.head.appendChild(script);
  });
  return loading;
}
