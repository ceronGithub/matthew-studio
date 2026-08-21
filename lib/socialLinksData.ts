/**
 * FILE: lib/socialLinksData.ts
 * PURPOSE:
 * Single source of truth for outbound social media links. Rendered in
 * the site Footer (every page) and on the Blog page header. Replace
 * the placeholder href values with the real profile URLs.
 *
 * DATA FLOW:
 * No database — static config. Icons come from lucide-react so no
 * extra icon assets are needed.
 */

export interface SocialLink {
  label: string;
  href: string;
  icon: "github" | "linkedin" | "twitter" | "youtube" | "facebook" | "instagram";
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/ceronGithub", icon: "github" },
  { label: "LinkedIn", href: "https://linkedin.com/in/your-profile", icon: "linkedin" },
  { label: "Twitter / X", href: "https://twitter.com/your-handle", icon: "twitter" },
  { label: "YouTube", href: "https://youtube.com/@your-channel", icon: "youtube" },
];
