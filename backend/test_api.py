import httpx
import sys

BASE_URL = "http://127.0.0.1:8080"
TIMEOUT = 15.0

def test_search():
    print("Testing /api/search...")
    response = httpx.get(f"{BASE_URL}/api/search?query=Taj&limit=3", timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "query" in data
    assert "results" in data
    assert len(data["results"]) > 0
    print("OK: /api/search passed successfully.")
    print("Results:", [r["name"] for r in data["results"]])

def test_swap():
    print("Testing /api/swap...")
    response = httpx.get(f"{BASE_URL}/api/swap?destination=Santorini&hour=12", timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["success"] is True
    assert "hotspot" in data
    assert "alternatives" in data
    assert len(data["alternatives"]) == 2
    print("OK: /api/swap passed successfully.")
    print("Hotspot:", data["hotspot"]["name"])
    print("Alternatives:", [a["name"] for a in data["alternatives"]])

def test_auth_login():
    print("Testing /api/auth/login...")
    payload = {"email": "traveler@alt.travel", "password": "pass"}
    response = httpx.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["role"] == "Traveler"
    print("OK: /api/auth/login passed successfully.")

def test_itinerary_optimize():
    print("Testing /api/itinerary/optimize...")
    payload = {
        "days": [
            {"day": 1, "destination": "Taj Mahal, Agra"},
            {"day": 2, "destination": "Manali, Himachal Pradesh"},
            {"day": 3, "destination": "Taj Mahal, Agra"}
        ]
    }
    response = httpx.post(f"{BASE_URL}/api/itinerary/optimize", json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "balanced" in data
    assert len(data["days"]) == 3
    print("OK: /api/itinerary/optimize passed successfully.")

def test_eco_pass_verify():
    print("Testing /api/eco-pass/verify...")
    payload = {
        "destination_name": "Orchha, Madhya Pradesh",
        "latitude": 25.3488,
        "longitude": 78.6436
    }
    response = httpx.post(f"{BASE_URL}/api/eco-pass/verify", json=payload, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["verified"] is True
    assert "voucher_code" in data
    print("OK: /api/eco-pass/verify passed successfully.")

def test_vibe_reports():
    print("Testing vibe report submission and listing...")
    # Get traveler token
    login_payload = {"email": "traveler@alt.travel", "password": "pass"}
    login_res = httpx.post(f"{BASE_URL}/api/auth/login", json=login_payload, timeout=TIMEOUT)
    token = login_res.json()["token"]

    # Submit report
    report_payload = {
        "destination": "Orchha, Madhya Pradesh",
        "report_text": "Beautiful quiet views of the river. Zero congestion!",
        "congestion_rating": "Quiet"
    }
    submit_res = httpx.post(f"{BASE_URL}/api/vibe/submit?token={token}", json=report_payload, timeout=TIMEOUT)
    assert submit_res.status_code == 200, f"Expected 200, got {submit_res.status_code}"
    
    # List reports
    list_res = httpx.get(f"{BASE_URL}/api/vibe/list?destination=Orchha, Madhya Pradesh", timeout=TIMEOUT)
    assert list_res.status_code == 200, f"Expected 200, got {list_res.status_code}"
    reports = list_res.json()
    assert len(reports) > 0
    print("OK: Vibe reports submit and list passed successfully.")

def test_eco_guide():
    print("Testing /api/alternative/itinerary...")
    response = httpx.get(f"{BASE_URL}/api/alternative/itinerary?alternative=Orchha", timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "alternative" in data
    assert "morning_activity" in data
    assert "eco_transit" in data
    print("OK: /api/alternative/itinerary passed successfully.")

def test_analytics():
    print("Testing /api/analytics...")
    response = httpx.get(f"{BASE_URL}/api/analytics?token=alt-travel-admin-pass-2026", timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "total_searches" in data
    assert "total_redirections" in data
    print("OK: /api/analytics passed successfully.")

if __name__ == "__main__":
    try:
        test_search()
        test_swap()
        test_auth_login()
        test_itinerary_optimize()
        test_eco_pass_verify()
        test_vibe_reports()
        test_eco_guide()
        test_analytics()
        print("\nALL TESTS PASSED SUCCESSFULLY! The backend changes are fully verified and functional.")
    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nUNEXPECTED ERROR: {e}")
        sys.exit(1)
