from unittest.mock import patch, MagicMock


def test_fetch_returns_none_on_network_error():
    from src.quran.fetcher import fetch_quran_json
    with patch("src.quran.fetcher.requests.get", side_effect=Exception("network down")):
        result = fetch_quran_json(force=True)
    assert result is None


def test_fetch_returns_path_on_success(tmp_path, monkeypatch):
    from src.quran.fetcher import fetch_quran_json
    from src.quran import fetcher
    monkeypatch.setattr(fetcher, "_QURAN_CACHE", tmp_path / "quran.json")
    monkeypatch.setattr(fetcher, "CACHE_DIR", tmp_path)
    mock_resp = MagicMock()
    mock_resp.text = '{"data": []}'
    mock_resp.raise_for_status = MagicMock()
    with patch("src.quran.fetcher.requests.get", return_value=mock_resp):
        result = fetch_quran_json(force=True)
    assert result is not None
    assert result.exists()
