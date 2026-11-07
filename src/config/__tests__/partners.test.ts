import { describe, expect, it } from "vitest";
import { activePartners, type Partner } from "../partners";

const p = (id: string, href?: string): Partner => ({ id, name: id, description: "", href, icon: "telegram", color: "#000", fallback: `https://${id}.example` });

describe("activePartners", () => {
  it("بدون أي رابط: كل القنوات بروابط المعاينة", () => {
    expect(activePartners([p("a"), p("b")]).map((x) => x.href)).toEqual(["https://a.example", "https://b.example"]);
  });
  it("مع روابط: المضبوطة فقط، و https فقط", () => {
    const list = [p("tg", "https://t.me/goalmood"), p("x"), p("bad", "javascript:alert(1)"), p("http", "http://insecure.example")];
    expect(activePartners(list).map((x) => x.id)).toEqual(["tg"]);
  });
});
