"""
Semgrep 규칙 자동 다운로드 및 설정
백엔드 서버 시작 시 자동으로 실행됩니다.
"""
import subprocess
import os
import shutil
import logging

logger = logging.getLogger(__name__)


def check_git_installed() -> bool:
    """Git이 설치되어 있는지 확인"""
    try:
        result = subprocess.run(
            ['git', '--version'],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def get_rules_directory() -> str:
    """규칙 디렉토리 경로 반환"""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_dir = os.path.join(backend_dir, 'config')
    rules_dir = os.path.join(config_dir, 'semgrep-rules')
    return rules_dir


def rules_exist() -> bool:
    """규칙이 이미 다운로드되어 있는지 확인"""
    rules_dir = get_rules_directory()

    # 디렉토리 존재 확인
    if not os.path.exists(rules_dir):
        return False

    # 최소한의 규칙 파일이 있는지 확인 (예: javascript, python 디렉토리)
    required_dirs = ['javascript', 'python', 'generic']
    for dir_name in required_dirs:
        dir_path = os.path.join(rules_dir, dir_name)
        if not os.path.exists(dir_path):
            return False

    return True


def download_semgrep_rules(force: bool = False) -> bool:
    """
    Semgrep 공식 규칙 저장소 다운로드

    Args:
        force: True면 기존 규칙을 삭제하고 새로 다운로드

    Returns:
        bool: 다운로드 성공 여부
    """
    rules_dir = get_rules_directory()

    # 이미 완전한 규칙이 존재하는 경우
    if rules_exist() and not force:
        logger.info(f"✓ Semgrep 규칙이 이미 존재합니다: {rules_dir}")
        return True

    # Git 확인
    if not check_git_installed():
        logger.error("❌ Git이 설치되어 있지 않아 Semgrep 규칙을 다운로드할 수 없습니다.")
        logger.error("Git 설치 후 서버를 재시작하거나, 수동으로 다운로드해주세요:")
        logger.error("  python backend/scripts/download_semgrep_rules.py")
        return False

    # config 디렉토리 생성
    config_dir = os.path.dirname(rules_dir)
    os.makedirs(config_dir, exist_ok=True)

    # 디렉토리가 존재하지만 불완전한 경우 (또는 force인 경우)
    if os.path.exists(rules_dir):
        if force:
            logger.info("기존 규칙을 삭제하고 새로 다운로드합니다...")
        else:
            logger.info("불완전한 규칙 디렉토리를 삭제하고 새로 다운로드합니다...")
        shutil.rmtree(rules_dir)

    logger.info("=" * 60)
    logger.info("Semgrep 규칙 자동 다운로드 시작")
    logger.info("=" * 60)
    logger.info(f"저장 위치: {rules_dir}")
    logger.info("⏳ 다운로드 중... (약 200MB, 1-3분 소요)")
    logger.info("서버 시작이 지연될 수 있습니다. 잠시만 기다려주세요...")

    try:
        # Git clone 실행
        result = subprocess.run(
            [
                'git', 'clone',
                '--depth', '1',  # 최신 버전만 (용량 절약)
                '--single-branch',
                '--quiet',  # 조용히 실행
                'https://github.com/returntocorp/semgrep-rules.git',
                rules_dir
            ],
            capture_output=True,
            text=True,
            timeout=300  # 5분 타임아웃
        )

        if result.returncode != 0:
            logger.error(f"❌ 다운로드 실패: {result.stderr}")
            return False

        logger.info("✓ 다운로드 완료!")

        # 통계 출력
        print_rule_statistics(rules_dir)

        # .git 디렉토리 삭제 (용량 절약)
        git_dir = os.path.join(rules_dir, '.git')
        if os.path.exists(git_dir):
            shutil.rmtree(git_dir)
            logger.info("✓ .git 디렉토리 정리 완료")

        logger.info("=" * 60)
        logger.info("✅ Semgrep 규칙 설치 완료!")
        logger.info("=" * 60)
        logger.info("이제 Semgrep 분석을 사용할 수 있습니다.")

        return True

    except subprocess.TimeoutExpired:
        logger.error("❌ 다운로드 시간 초과 (5분)")
        logger.error("네트워크 연결을 확인하고 서버를 재시작해주세요.")
        return False
    except Exception as e:
        logger.error(f"❌ 다운로드 중 오류 발생: {e}")
        return False


def print_rule_statistics(rules_dir: str):
    """규칙 통계 출력"""
    categories = [
        ('javascript', 'JavaScript/TypeScript'),
        ('python', 'Python'),
        ('generic', 'Generic (모든 언어)'),
    ]

    logger.info("📊 다운로드된 규칙:")

    for dir_name, label in categories:
        dir_path = os.path.join(rules_dir, dir_name)
        if os.path.exists(dir_path):
            # YAML 파일 개수 세기
            yaml_count = sum(1 for root, dirs, files in os.walk(dir_path)
                            for f in files if f.endswith(('.yaml', '.yml')))
            if yaml_count > 0:
                logger.info(f"  - {label}: ~{yaml_count} 규칙 파일")


async def setup_semgrep():
    """
    Semgrep 설정 (서버 시작 시 호출)
    규칙이 없으면 자동으로 다운로드합니다.
    """
    logger.info("Semgrep 설정을 확인합니다...")

    # 규칙 확인 및 다운로드
    if not rules_exist():
        logger.warning("⚠️  Semgrep 규칙이 없습니다. 자동으로 다운로드를 시작합니다.")
        logger.warning("⚠️  최초 1회만 실행되며, 이후에는 로컬 규칙을 사용합니다.")

        success = download_semgrep_rules()

        if not success:
            logger.warning("⚠️  Semgrep 규칙 다운로드 실패")
            logger.warning("⚠️  Semgrep 분석은 건너뛰어집니다.")
            logger.warning("⚠️  수동 다운로드: python backend/scripts/download_semgrep_rules.py")
    else:
        logger.info("✓ Semgrep 규칙 확인 완료")
