declare interface NavSubPage {
  title: string;
  link: string;
}

/** One enlargeable image: what PhotoGallery lays out and Lightbox opens. */
declare interface GalleryShot {
  src: string;
  alt: string;
  caption: string;
  /** Set on CAD screenshots, which are drawn on white and need a light plate
   *  rather than the page ground behind them. */
  paper?: boolean;
}

declare type DesignDecisionFigure = GalleryShot;

/** Drop an mp4 in assets/videos, import it, and hand it to a decision. */
declare interface DesignDecisionVideo {
  src: string;
  poster?: string;
  caption: string;
}

/** One row of the Ladybug design-decisions accordion. `why` is the one-line
 *  reason shown collapsed; `detail` is authored HTML revealed on expand. */
declare interface DesignDecision {
  tag: string;
  hue: "cyan" | "violet" | "magenta";
  what: string;
  why: string;
  detail: string;
  figures?: DesignDecisionFigure[];
  video?: DesignDecisionVideo;
}

type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
      Required<Pick<T, K>>
      & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

declare type NavPage = RequireOnlyOne<{
  title: string;
  link?: string;
  subPages?: NavSubPage[];
}, "link" | "subpages">