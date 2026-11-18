export type DeviceHints = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  mobile?: boolean;
  coarsePointer: boolean;
  finePointer: boolean;
};

function currentDevice(): DeviceHints {
  const device = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return {
    userAgent: device.userAgent,
    platform: device.platform,
    maxTouchPoints: device.maxTouchPoints,
    mobile: device.userAgentData?.mobile,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    finePointer: matchMedia("(any-pointer: fine)").matches,
  };
}

export function isMobileDevice(device: DeviceHints): boolean {
  // Un puntero táctil también puede pertenecer a una PC o laptop.
  // Bloquear solo cuando el navegador identifica un dispositivo móvil.
  return device.mobile === true
    || /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|Opera Mini|webOS|BlackBerry/i.test(device.userAgent)
    || (device.platform === "MacIntel" && device.maxTouchPoints > 1);
}

export function startDesktopExperience(
  root: HTMLElement,
  start: () => unknown,
  device: DeviceHints = currentDevice(),
): boolean {
  if (!isMobileDevice(device)) {
    start();
    return true;
  }

  root.classList.add("desktop-access");
  root.innerHTML = `
    <main class="desktop-access__card" aria-labelledby="desktop-access-title">
      <header class="desktop-access__brand">
        <img src="/assets/logo-uc-sapientia.png" width="44" height="44" alt="Universidad Católica">
        <div>Universidad Católica<small>Campus Santa Librada</small></div>
      </header>
      <div class="desktop-access__illustration" aria-hidden="true">
        <svg viewBox="0 0 80 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="14" y="7" width="52" height="37" rx="4" />
          <path d="M14 44 6 54a2 2 0 0 0 2 3h64a2 2 0 0 0 2-3l-8-10M31 51h18M24 34V22h13v12m0 0V16h18v18M21 35h38M29 26h3m11-5h6m-6 6h6" />
        </svg>
      </div>
      <p class="desktop-access__eyebrow">Tour virtual · Ciencias y Tecnología</p>
      <h1 id="desktop-access-title">El campus se disfruta mejor en una computadora.</h1>
      <p class="desktop-access__message">Para disfrutar de una mejor experiencia, abrí el recorrido desde una <strong>PC o laptop</strong>.</p>
      <p class="desktop-access__hint">Vas a necesitar teclado y mouse para explorar el campus.</p>
    </main>`;
  return false;
}
