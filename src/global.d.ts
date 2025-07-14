// Handle CSS modules
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Handle other common assets (add these too for future-proofing)
declare module "*.png";
declare module "*.jpg";
declare module "*.svg";
