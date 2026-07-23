// Service worker do painel Rodrigo Equipcar
// Estratégia: busca a versão mais nova na rede primeiro; só usa a cópia
// guardada no aparelho se estiver sem internet. Isso evita mostrar uma
// versão desatualizada do painel depois que uma atualização é publicada.
// Os dados em si continuam vindo do Firebase, então cadastrar/editar
// sempre exige conexão — o cache aqui é só do "casco" (HTML/CSS/JS/ícones).

const CACHE_NAME = "equipcar-shell-v2";
const SHELL_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca guarda em cache chamadas ao Firebase/Firestore — sempre busca na rede.
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com")) {
    return;
  }
  if (event.request.method !== "GET") return;

  // Network-first: tenta buscar a versão mais nova; só cai pro cache
  // guardado se a rede falhar (sem internet) ou demorar demais.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
