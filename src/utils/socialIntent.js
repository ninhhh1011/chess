export const NINH_INSTAGRAM_URL = "https://www.instagram.com/ngvninhh";

function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function normalizeSocialQuery(input = "") {
  return removeVietnameseTones(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isInstagramIntent(message = "") {
  const q = normalizeSocialQuery(message);

  // Nhóm từ khóa nền
  const instagramWords = [
    "instagram",
    "insta",
    "ig",
    "i g",
    "ins"
  ];

  // Nhóm liên quan đến Ninh
  const ninhWords = [
    "ninh",
    "ngvninhh",
    "ngv ninhh",
    "ngv ninh",
    "nguyen vu ninh",
    "anh ninh",
    "sep" // "ig cua sep dau"
  ];

  // Nhóm liên quan đến Lốp
  const lopWords = [
    "lop",
    "lop truong",
    "ninh lop",
    "ninh lop truong"
  ];

  // Nhóm hành động
  const requestWords = [
    "cho xin",
    "xin",
    "gui",
    "mo",
    "link",
    "profile",
    "nick",
    "account",
    "tai khoan",
    "trang ca nhan",
    "mxh",
    "social",
    "in4",
    "fb",
    "tim",
    "dan toi",
    "chuyen toi",
    "dung",
    "co"
  ];

  const hasInstagramWord = instagramWords.some((word) => {
    if (word === "ig" || word === "ins") {
      return new RegExp(`(^|\\s)${word}(\\s|$)`).test(q);
    }
    return q.includes(word);
  });

  const hasNinhOrLop = [...ninhWords, ...lopWords].some((word) => q.includes(word));
  const hasRequestWord = requestWords.some((word) => q.includes(word));

  // Direct exact matches for short keywords
  if (q === "ig" || q === "ins" || q === "instagram" || q === "insta") return true;
  if (q === "ngvninhh") return true;

  // Composite matches
  return hasInstagramWord && (hasNinhOrLop || hasRequestWord);
}
