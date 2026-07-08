
1. 개요
이 문서는 FastAPI를 활용한 **Titanic (James)** 서버의 초기 설정 정보를 담고 있습니다.

- **프로젝트명**: Titanic (James)
    
- **주요 프레임워크**: FastAPI
    
- **서버 엔진**: Uvicorn

2. 초기화 소스 코드( james.py )
아래 코드는 서버의 가장 기본적인 진입점(Entry Point)입니다.

from fastapi import FastAPI
from walter import Walter

app = FastAPI(title="Titanic (James)")

class James:
    """
    타이타닉 데이터 처리 및 비즈니스 로직을 담당할 클래스
    """
    def __init__(self):
        pass

@app.get("/")
def read_root():
    """
    서버 연결 상태 확인용 루트 엔드포인트
    """
    return {
        "message": "FAST API 초기화 성공", 
        "docs": "/docs",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    # 파일명이 james.py인 경우 "james:app"으로 실행
    uvicorn.run("james:app", host="127.0.0.1", port=8000, reload=True)