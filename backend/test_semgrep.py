#!/usr/bin/env python3
"""
Semgrep 테스트 스크립트
Extension 재시작 없이 빠르게 Semgrep 동작 테스트
"""
import subprocess
import json
import os
import sys

def test_semgrep():
    # 프로젝트 루트 경로
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # 테스트 파일 경로
    test_file = os.path.join(project_root, 'frontend', 'src', 'test-security.ts')

    # Custom rules 경로
    rules_file = os.path.join(project_root, 'backend', 'config', 'custom-semgrep-rules.yaml')

    print("=" * 60)
    print("Semgrep 테스트 스크립트")
    print("=" * 60)

    # 1. Python 버전 확인
    python_version = subprocess.run(
        ['python3', '--version'],
        capture_output=True,
        text=True
    )
    print(f"✓ Python 버전: {python_version.stdout.strip()}")

    # 2. .python-version에서 Python 버전 읽기
    python_version_file = os.path.join(project_root, '.python-version')
    semgrep_cmd = 'semgrep'  # Default

    if os.path.exists(python_version_file):
        with open(python_version_file, 'r') as f:
            py_version = f.read().strip()
            semgrep_cmd = os.path.expanduser(f'~/.pyenv/versions/{py_version}/bin/semgrep')
            print(f"✓ .python-version: {py_version}")
            print(f"✓ Semgrep 경로: {semgrep_cmd}")

    # 3. Semgrep 설치 확인
    try:
        semgrep_version = subprocess.run(
            [semgrep_cmd, '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if semgrep_version.returncode == 0:
            version_lines = semgrep_version.stdout.strip().split('\n')
            print(f"✓ Semgrep 버전: {version_lines[0]}")
        else:
            print(f"❌ Semgrep 설치 안됨 또는 오류")
            return False
    except Exception as e:
        print(f"❌ Semgrep 확인 실패: {e}")
        return False

    # 3. 테스트 파일 존재 확인
    if os.path.exists(test_file):
        print(f"✓ 테스트 파일: {test_file}")
    else:
        print(f"❌ 테스트 파일 없음: {test_file}")
        return False

    # 4. Rules 파일 존재 확인
    if os.path.exists(rules_file):
        print(f"✓ Rules 파일: {rules_file}")
    else:
        print(f"❌ Rules 파일 없음: {rules_file}")
        return False

    print("\n" + "=" * 60)
    print("Semgrep 실행 중...")
    print("=" * 60)

    # 5. Semgrep 실행
    cmd = [
        semgrep_cmd,
        '--json',
        '--no-git-ignore',
        # NOTE: Don't use --quiet, it suppresses JSON output!
        '--metrics=off',
        '--disable-version-check',
        '--no-force-color',
        '--config', rules_file,
        test_file
    ]

    print(f"명령어: {' '.join(cmd)}")
    print()

    env = os.environ.copy()
    env['PYTHONWARNINGS'] = 'ignore'

    # Don't capture stderr, let it flow to terminal to see actual errors
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,  # Merge stderr into stdout
        text=True,
        cwd=project_root,
        env=env,
        timeout=30
    )

    # 6. 결과 분석
    print("=" * 60)
    print("실행 결과")
    print("=" * 60)

    print(f"Exit code: {result.returncode}")
    print(f"Output length: {len(result.stdout)} bytes")
    print(f"\n--- Full Output ---")
    print(result.stdout)
    print("--- End Output ---\n")

    # Exit code 분석
    if result.returncode == 0:
        print("✓ Exit code 0: 이슈 없음 또는 정상 종료")
    elif result.returncode == 1:
        print("✓ Exit code 1: 이슈 발견")
    elif result.returncode == 2:
        print("⚠️  Exit code 2: Fatal error (hashlib 문제 가능성)")
    elif result.returncode == 7:
        print("⚠️  Exit code 7: 경고 있지만 결과 유효")
    else:
        print(f"❌ Exit code {result.returncode}: 알 수 없는 오류")

    # Output에서 오류 체크 (stderr merged into stdout)
    if 'blake2' in result.stdout or 'hashlib' in result.stdout or 'ERROR' in result.stdout:
        print("\n--- 오류 메시지 발견 ---")
        # Find error lines in output
        for line in result.stdout.split('\n')[:50]:
            if 'blake2' in line or 'hashlib' in line or 'ERROR' in line or 'Traceback' in line:
                print(line)

    # JSON 파싱
    if result.stdout:
        try:
            print("\n--- JSON 결과 ---")
            data = json.loads(result.stdout)

            results = data.get('results', [])
            print(f"✓ JSON 파싱 성공")
            print(f"✓ 검출된 이슈: {len(results)}개")

            if len(results) > 0:
                print("\n--- 검출된 이슈 목록 ---")
                for i, issue in enumerate(results, 1):
                    rule_id = issue.get('check_id', 'unknown')
                    line = issue.get('start', {}).get('line', 0)
                    severity = issue.get('extra', {}).get('severity', 'INFO')
                    message = issue.get('extra', {}).get('message', '')

                    print(f"{i}. {rule_id} (Line {line}) [{severity}]")
                    print(f"   {message}")

                print("\n✅ 테스트 성공: Semgrep이 정상적으로 이슈를 검출했습니다!")
                return True
            else:
                print("\n⚠️  경고: 이슈가 검출되지 않았습니다")
                print("테스트 파일에는 8개의 이슈가 있어야 합니다:")
                print("  - eval() 사용 (1개)")
                print("  - console.log (2개)")
                print("  - 하드코딩된 credentials (3개)")
                print("  - TODO/FIXME 주석 (2개)")
                return False

        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 실패: {e}")
            print(f"Stdout preview: {result.stdout[:300]}")
            return False
    else:
        print("\n❌ Stdout이 비어있습니다")
        return False

if __name__ == '__main__':
    print()
    success = test_semgrep()
    print("\n" + "=" * 60)

    if success:
        print("✅ 모든 테스트 통과!")
        sys.exit(0)
    else:
        print("❌ 테스트 실패")
        sys.exit(1)
