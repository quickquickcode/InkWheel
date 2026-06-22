from pathlib import Path

from app.services.github_sync import GithubSyncService


def test_github_sync_status_for_missing_repo():
    svc = GithubSyncService()
    svc.repo_paths = {"missing": Path("/nonexistent/path")}

    status = svc.status("missing")

    assert status.name == "missing"
    assert status.error == "仓库目录不存在"


def test_github_sync_status_parses_git_output(tmp_path, monkeypatch):
    repo_dir = tmp_path / "toutiao"
    repo_dir.mkdir()

    def fake_run(self, cwd, *cmd, capture_output=True, text=True, timeout=30):
        class Completed:
            pass

        c = Completed()
        cmd_list = list(cmd)
        if cmd_list == ["rev-parse", "HEAD"]:
            c.returncode = 0
            c.stdout = "abc123def456\n"
            c.stderr = ""
        elif cmd_list == ["status", "--short"]:
            c.returncode = 0
            c.stdout = " M README.md\n"
            c.stderr = ""
        elif cmd_list == ["rev-list", "--count", "HEAD..@{upstream}"]:
            c.returncode = 0
            c.stdout = "2\n"
            c.stderr = ""
        else:
            c.returncode = 1
            c.stdout = ""
            c.stderr = ""
        return c.returncode, c.stdout, c.stderr

    monkeypatch.setattr("app.services.github_sync.GithubSyncService._run", fake_run)

    svc = GithubSyncService()
    svc.repo_paths = {"toutiao": repo_dir}

    status = svc.status("toutiao")

    assert status.current_commit == "abc123def456"
    assert status.dirty is True
    assert status.commits_behind == 2
