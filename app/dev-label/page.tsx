import { notFound } from "next/navigation";
import LabelTool from "./LabelTool";

/** DEV ONLY: labelling tool for the component maps. In a production build this route answers 404 and is never linked. */
export default function DevLabelPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LabelTool />;
}
