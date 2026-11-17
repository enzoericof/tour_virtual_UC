import "./ui/desktop-access.css";
import { startDesktopExperience } from "./ui/desktop-access";

startDesktopExperience(document.querySelector<HTMLElement>("#app")!, () => import("./tour"));
