# tests/harness/test_composer.py
from harness.assertions import AssertionResult
from harness.composer import compose


class TestCompose:
    def test_all_pass(self):
        v = compose(gauntlet_status="pass",
                    assertion_results=[AssertionResult("a", 0, "", "")])
        assert v.final == "pass"
        assert v.gauntlet == "pass"
        assert v.assertions == "pass"

    def test_gauntlet_fail_dominates(self):
        v = compose(gauntlet_status="fail",
                    assertion_results=[AssertionResult("a", 0, "", "")])
        assert v.final == "fail"
        assert v.assertions == "pass"

    def test_assertion_fail_dominates(self):
        v = compose(gauntlet_status="pass", assertion_results=[
            AssertionResult("a", 0, "", ""),
            AssertionResult("b", 1, "", "boom"),
        ])
        assert v.final == "fail"
        assert v.assertions == "fail"

    def test_investigate_is_fail(self):
        v = compose(gauntlet_status="investigate", assertion_results=[])
        assert v.gauntlet == "investigate"
        assert v.final == "fail"

    def test_no_assertions_passes_when_gauntlet_passes(self):
        v = compose(gauntlet_status="pass", assertion_results=[])
        assert v.final == "pass"

    def test_to_dict_serializable(self):
        v = compose(gauntlet_status="pass",
                    assertion_results=[AssertionResult("a", 0, "ok", "")])
        d = v.to_dict()
        assert d["final"] == "pass"
        assert d["assertion_details"] == [
            {"name": "a", "exit_code": 0, "stdout": "ok", "stderr": ""}
        ]
