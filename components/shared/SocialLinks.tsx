/**
 * FILE: components/shared/SocialLinks.tsx
 * ROLE: Public — reused in the site Footer (every page) and the
 * Blog page header.
 *
 * PURPOSE:
 * Renders the SOCIAL_LINKS config (lib/socialLinksData.ts) as a row
 * of icon links. Each link opens in a new tab since it leaves the
 * site. Brand icons are hand-drawn minimal SVGs below — lucide-react
 * dropped brand/logo icons from its set, so these aren't imported
 * from there.
 */
import type { SVGProps } from "react";
import { SOCIAL_LINKS, type SocialLink } from "@/lib/socialLinksData";

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

const GithubIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.5 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.22-3.37-1.22-.46-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.35c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .28.18.61.69.5A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
  </svg>
);

const LinkedinIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 20h-3.37v-5.9c0-1.4-.03-3.2-1.95-3.2-1.96 0-2.26 1.53-2.26 3.1V20h-3.37V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.2-1.77 3.42 0 4.05 2.25 4.05 5.18V20Z" />
  </svg>
);

const TwitterIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.24 3H21l-6.55 7.49L22 21h-6.28l-4.92-6.44L5.16 21H2.4l7-8.01L2 3h6.44l4.44 5.88L18.24 3Zm-1.1 16.17h1.53L7.9 4.74H6.26l10.88 14.43Z" />
  </svg>
);

const YoutubeIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22 12c0-2.5-.24-4.03-.4-4.75a2.98 2.98 0 0 0-2.1-2.1C18.03 4.9 12 4.9 12 4.9s-6.03 0-7.5.25a2.98 2.98 0 0 0-2.1 2.1C2.24 7.97 2 9.5 2 12s.24 4.03.4 4.75a2.98 2.98 0 0 0 2.1 2.1c1.47.25 7.5.25 7.5.25s6.03 0 7.5-.25a2.98 2.98 0 0 0 2.1-2.1c.16-.72.4-2.25.4-4.75Zm-11.99 3.06V8.94L15.5 12l-5.49 3.06Z" />
  </svg>
);

const FacebookIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13.5 21v-7.6h2.55l.38-2.96h-2.93V8.55c0-.86.24-1.44 1.47-1.44h1.57V4.46c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9v2.2H7.9v2.96h2.56V21h3.04Z" />
  </svg>
);

const InstagramIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2.16c2.67 0 2.99.01 4.04.06 2.72.12 3.99 1.41 4.12 4.12.05 1.05.06 1.37.06 4.04 0 2.67-.01 2.99-.06 4.04-.13 2.71-1.4 3.99-4.12 4.12-1.05.05-1.37.06-4.04.06-2.67 0-2.99-.01-4.04-.06-2.72-.13-3.99-1.41-4.12-4.12-.05-1.05-.06-1.37-.06-4.04 0-2.67.01-2.99.06-4.04C4 3.63 5.27 2.34 8 2.22c1.05-.05 1.37-.06 4.04-.06ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.25a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5Zm5.2-8.4a1.17 1.17 0 1 1-2.34 0 1.17 1.17 0 0 1 2.34 0Z" />
  </svg>
);

const ICONS: Record<SocialLink["icon"], IconComponent> = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
};

export default function SocialLinks() {
  return (
    <div className="socialLinks">
      {SOCIAL_LINKS.map((link) => {
        const Icon = ICONS[link.icon];
        return (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className="socialLinkIcon"
          >
            <Icon width={16} height={16} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
