export type {};

declare module "react" {
  interface HTMLAttributes {
    tw?: string;
  }

  interface SVGProps {
    tw?: string;
  }
}
