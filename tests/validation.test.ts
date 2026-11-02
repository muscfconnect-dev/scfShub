import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeUrl,
  reviewSchema,
  entrySchema,
  hasPermission,
  caseSchema,
} from "../src/lib/domain";
test("content links reject javascript, data and protocol-relative URLs", () => {
  for (const u of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//evil.example",
    "/\\evil.example",
  ])
    assert.equal(safeUrl(u), "");
  assert.equal(
    safeUrl("https://chat.whatsapp.com/abc"),
    "https://chat.whatsapp.com/abc",
  );
  assert.equal(safeUrl("/archive"), "/archive");
});
test("course reviews require identifying course information", () => {
  const result = reviewSchema.safeParse({
    kind: "course",
    title: "Useful course",
    rating: 4,
    body: "This is a detailed review that should help.",
    author_name: "Student",
  });
  assert.equal(result.success, false);
});
test("resources require a valid uploaded file identifier", () => {
  assert.equal(
    entrySchema.safeParse({
      kind: "resource",
      title: "Notes",
      slug: "notes",
      data: {
        course_code: "COS 101",
        faculty: "Computing",
        departments: ["Computer Science"],
        level: "100",
        session: "2026/27",
        material_type: "Notes",
        file_id: "not-a-file",
      },
    }).success,
    false,
  );
});
test("deactivated staff have no permissions", () => {
  assert.equal(
    hasPermission(
      {
        id: "x",
        email: "x@example.test",
        display_name: "Owner",
        role: "owner",
        permissions: [],
        active: false,
      },
      "staff",
    ),
    false,
  );
});
test("private complaints require a reply email and useful description", () => {
  assert.equal(
    caseSchema.safeParse({
      kind: "general",
      category: "Welfare",
      subject: "Help",
      name: "Student",
      email: "invalid",
      message: "short",
    }).success,
    false,
  );
});
