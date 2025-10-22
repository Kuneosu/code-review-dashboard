"""
Ollama LLM client for AI-powered code analysis
"""
import httpx
from typing import Dict, Any, Optional, List, Union
from enum import Enum


class OllamaModel(str, Enum):
    """Available Ollama models for code analysis"""
    CODELLAMA_7B = "codellama:7b"
    CODELLAMA_13B = "codellama:13b"
    CODELLAMA_34B = "codellama:34b"
    DEEPSEEK_CODER_6_7B = "deepseek-coder:6.7b"
    DEEPSEEK_CODER_33B = "deepseek-coder:33b"


class OllamaClient:
    """Client for interacting with Ollama LLM service"""

    def __init__(self, base_url: str = "http://localhost:11434"):
        """
        Initialize Ollama client

        Args:
            base_url: Ollama API base URL (default: http://localhost:11434)
        """
        self.base_url = base_url
        # Model can be OllamaModel enum or string (for custom/unknown models)
        self.model: Union[OllamaModel, str] = OllamaModel.CODELLAMA_7B
        self.timeout = 120.0  # 2 minutes for generation

    async def health_check(self) -> Dict[str, Any]:
        """
        Check Ollama service health and available models

        Returns:
            Dict with status and available models
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")

                if response.status_code == 200:
                    data = response.json()
                    models = [m["name"] for m in data.get("models", [])]

                    return {
                        "status": "healthy",
                        "models": models,
                        "count": len(models)
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "error": f"HTTP {response.status_code}",
                        "models": []
                    }

        except httpx.ConnectError:
            return {
                "status": "unhealthy",
                "error": "Cannot connect to Ollama service. Is it running?",
                "models": []
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "models": []
            }

    async def select_best_model(self) -> Optional[str]:
        """
        Select the best available model from installed models

        Priority: codellama:13b > codellama:7b > deepseek-coder:6.7b

        Returns:
            Selected model name or None if no suitable model found
        """
        health = await self.health_check()

        if health["status"] != "healthy":
            return None

        available_models = health["models"]

        # Priority order
        priority_models = [
            OllamaModel.CODELLAMA_13B,
            OllamaModel.CODELLAMA_7B,
            OllamaModel.DEEPSEEK_CODER_6_7B,
            OllamaModel.DEEPSEEK_CODER_33B,
            OllamaModel.CODELLAMA_34B,
        ]

        for model in priority_models:
            if model.value in available_models:
                self.model = model
                return model.value

        # If no priority model found, use first available code model
        # Store as string (not in OllamaModel enum) - type-safe with Union type
        for model in available_models:
            if "code" in model.lower() or "llama" in model.lower():
                self.model = model  # Union[OllamaModel, str] allows string assignment
                return model

        return None

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """
        Generate AI response using Ollama

        Args:
            prompt: User prompt
            system_prompt: System prompt for context
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with response text and metadata
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Get model string value (handles both enum and str types)
                model_name = self.model.value if isinstance(self.model, OllamaModel) else self.model

                payload = {
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    }
                }

                if system_prompt:
                    payload["system"] = system_prompt

                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "response": data.get("response", ""),
                        "model": data.get("model", self.model),
                        "total_duration": data.get("total_duration", 0),
                        "load_duration": data.get("load_duration", 0),
                        "eval_count": data.get("eval_count", 0),
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "response": ""
                    }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Request timeout - model may be slow or unresponsive",
                "response": ""
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": ""
            }

    async def generate_complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """
        Generate AI response using chat completion format

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with response text and metadata
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    }
                }

                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()
                    message = data.get("message", {})

                    return {
                        "success": True,
                        "response": message.get("content", ""),
                        "model": data.get("model", self.model),
                        "total_duration": data.get("total_duration", 0),
                        "eval_count": data.get("eval_count", 0),
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "response": ""
                    }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Request timeout",
                "response": ""
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "response": ""
            }
