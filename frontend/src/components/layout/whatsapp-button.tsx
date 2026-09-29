const NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

/** Floating WhatsApp support shortcut (hidden when no number is configured). */
export function WhatsAppButton() {
  if (!NUMBER) return null;
  const href = `https://wa.me/${NUMBER}?text=${encodeURIComponent('Hi SKYMAP TRADERS, I need help with…')}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105"
    >
      <svg viewBox="0 0 32 32" className="size-7 fill-current" aria-hidden>
        <path d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.11.56 4.17 1.62 5.99L4 29l8.24-1.58a12.1 12.1 0 0 0 3.8.6C22.67 28.02 28 22.66 28 16.05 28 9.44 22.67 3 16.04 3Zm0 22.9c-1.2 0-2.37-.2-3.48-.58l-.25-.08-4.9.94.96-4.72-.17-.27a9.84 9.84 0 0 1-1.52-5.22c0-5.43 4.44-9.85 9.9-9.85 5.45 0 9.88 4.42 9.88 10 0 5.43-4.43 9.78-10.42 9.78Zm5.43-7.36c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
