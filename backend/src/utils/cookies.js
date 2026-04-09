function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

function buildCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const accessMaxAge = 15 * 60 * 1000;
  const refreshMaxAge = 7 * 24 * 60 * 60 * 1000;

  res.cookie("access_token", accessToken, buildCookieOptions(accessMaxAge));
  res.cookie("refresh_token", refreshToken, buildCookieOptions(refreshMaxAge));
}

function clearAuthCookies(res) {
  const expiredOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  };

  res.cookie("access_token", "", expiredOptions);
  res.cookie("refresh_token", "", expiredOptions);
}

module.exports = {
  parseCookies,
  setAuthCookies,
  clearAuthCookies,
};
