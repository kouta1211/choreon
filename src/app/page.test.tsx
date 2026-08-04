import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("見出しが表示される", () => {
    render(<Home />);
    expect(screen.getByText("Choreon")).toBeInTheDocument();
  });
});
