import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import type { PublishReportItem } from "@/lib/types";
import { PublishReport } from "./publish-report";

afterEach(cleanup);

const allSuccess: PublishReportItem[] = [
  { kind: "listing", ref: "en-US", status: "published" },
  { kind: "asset", ref: "screenshot-1.png", status: "published" },
];

const mixed: PublishReportItem[] = [
  { kind: "listing", ref: "en-US", status: "published" },
  { kind: "listing", ref: "de-DE", status: "failed", error: "Invalid keywords" },
  { kind: "asset", ref: "screenshot-1.png", status: "published" },
  { kind: "localization", ref: "fr-FR", status: "failed", error: "Missing title" },
];

describe("PublishReport", () => {
  test("renders nothing for an empty report", () => {
    const { container } = render(<PublishReport report={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("shows a success summary when all items published", () => {
    render(<PublishReport report={allSuccess} />);
    expect(screen.getByText("2 published")).toBeInTheDocument();
    expect(screen.queryByText("Partial failure")).not.toBeInTheDocument();
  });

  test("groups items by kind", () => {
    render(<PublishReport report={mixed} />);
    expect(screen.getByText("Listings")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("Localizations")).toBeInTheDocument();
  });

  test("surfaces a partial failure with counts and error messages", () => {
    render(<PublishReport report={mixed} />);
    expect(screen.getByText("2 published, 2 failed")).toBeInTheDocument();
    expect(screen.getByText("Partial failure")).toBeInTheDocument();
    expect(screen.getByText("Invalid keywords")).toBeInTheDocument();
    expect(screen.getByText("Missing title")).toBeInTheDocument();
  });

  test("renders each item ref", () => {
    render(<PublishReport report={mixed} />);
    expect(screen.getByText("en-US")).toBeInTheDocument();
    expect(screen.getByText("de-DE")).toBeInTheDocument();
    expect(screen.getByText("fr-FR")).toBeInTheDocument();
    expect(screen.getByText("screenshot-1.png")).toBeInTheDocument();
  });
});
