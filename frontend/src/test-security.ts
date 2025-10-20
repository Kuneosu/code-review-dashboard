// 테스트용 보안 이슈 파일
// Semgrep이 검출해야 하는 취약점들

export function vulnerableCode() {
  // 1. console.log - 프로덕션에서 제거해야 함
  console.log("User data:", userData);
  console.log("API response:", response);

  // 2. eval 사용 - 매우 위험
  const userInput = prompt("Enter code");
  eval(userInput); // XSS 취약점

  // 3. 하드코딩된 비밀번호
  const password = "admin123";
  const api_key = "sk_live_1234567890abcdef";
  const secret = "my_secret_token_xyz";

  // 4. TODO 주석
  // TODO: 이 함수 리팩토링 필요
  // FIXME: 보안 문제 수정

  return "vulnerable";
}
