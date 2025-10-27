"""
AgroShield - API Configuration Management
Centralized API key management and validation for Phase 2

Services:
- CGIAR Plant Health Database
- KEPHIS Registered Products
- OpenWeatherMap API
- AccuWeather API
- Hugging Face NLP
- FAO SoilGrids (no key needed)
"""

import os
import requests
from typing import Dict, Optional
from datetime import datetime
import json
from pathlib import Path


class APIConfig:
    """
    Centralized API configuration and validation.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize API configuration.
        
        Args:
            config_path: Path to JSON config file (optional)
        """
        self.config_path = config_path or "config/api_keys.json"
        self.api_keys = {}
        self.api_status = {}
        
        # Load from file or environment
        self._load_config()
    
    def _load_config(self):
        """
        Load API keys from JSON file or environment variables.
        """
        # Try loading from file
        config_file = Path(self.config_path)
        if config_file.exists():
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                self.api_keys.update(file_config.get('api_keys', {}))
        
        # Override with environment variables (higher priority)
        env_keys = {
            'cgiar': os.getenv('CGIAR_API_KEY'),
            'kephis': os.getenv('KEPHIS_API_KEY'),
            'openweathermap': os.getenv('OPENWEATHERMAP_API_KEY'),
            'accuweather': os.getenv('ACCUWEATHER_API_KEY'),
            'huggingface': os.getenv('HUGGINGFACE_TOKEN'),
            'africas_talking': os.getenv('AFRICAS_TALKING_API_KEY'),
            'twilio_account_sid': os.getenv('TWILIO_ACCOUNT_SID'),
            'twilio_auth_token': os.getenv('TWILIO_AUTH_TOKEN')
        }
        
        for key, value in env_keys.items():
            if value:
                self.api_keys[key] = value
    
    def validate_all_keys(self) -> Dict[str, dict]:
        """
        Validate all configured API keys by making test requests.
        
        Returns:
            dict: Validation status for each service
        """
        print("\n" + "="*60)
        print("API KEY VALIDATION")
        print("="*60)
        
        validators = {
            'cgiar': self._validate_cgiar,
            'kephis': self._validate_kephis,
            'openweathermap': self._validate_openweathermap,
            'accuweather': self._validate_accuweather,
            'huggingface': self._validate_huggingface,
            'africas_talking': self._validate_africas_talking
        }
        
        results = {}
        
        for service, validator in validators.items():
            if service in self.api_keys:
                try:
                    status = validator()
                    results[service] = status
                    
                    status_icon = "✓" if status['valid'] else "✗"
                    print(f"{status_icon} {service}: {status['message']}")
                    
                except Exception as e:
                    results[service] = {
                        'valid': False,
                        'message': f"Error: {str(e)}",
                        'timestamp': datetime.now().isoformat()
                    }
                    print(f"✗ {service}: Validation error - {str(e)}")
            else:
                results[service] = {
                    'valid': False,
                    'message': 'API key not configured',
                    'timestamp': datetime.now().isoformat()
                }
                print(f"⚠️  {service}: API key not configured")
        
        # FAO SoilGrids (no key needed)
        results['fao_soilgrids'] = {
            'valid': True,
            'message': 'No API key required - public service',
            'timestamp': datetime.now().isoformat()
        }
        print(f"✓ fao_soilgrids: Public service (no key needed)")
        
        self.api_status = results
        return results
    
    def _validate_cgiar(self) -> dict:
        """
        Validate CGIAR API key.
        
        CGIAR API: International agricultural research database
        Endpoint: https://api.cgiar.org/v1/
        Contact: research@cgiar.org
        """
        api_key = self.api_keys.get('cgiar')
        
        # Test endpoint (example - adjust based on actual CGIAR API docs)
        url = "https://api.cgiar.org/v1/plant-diseases"
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return {
                    'valid': True,
                    'message': 'API key valid - access granted',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 401:
                return {
                    'valid': False,
                    'message': 'Invalid API key',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'valid': False,
                    'message': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        
        except requests.exceptions.Timeout:
            return {
                'valid': False,
                'message': 'Request timeout',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_kephis(self) -> dict:
        """
        Validate KEPHIS API key.
        
        KEPHIS API: Kenya Plant Health Inspectorate Service
        Endpoint: https://api.kephis.go.ke/v1/
        Contact: kephis.go.ke/developers
        """
        api_key = self.api_keys.get('kephis')
        
        url = "https://api.kephis.go.ke/v1/registered-products"
        headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return {
                    'valid': True,
                    'message': 'API key valid - access granted',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 401 or response.status_code == 403:
                return {
                    'valid': False,
                    'message': 'Invalid or unauthorized API key',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'valid': False,
                    'message': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_openweathermap(self) -> dict:
        """
        Validate OpenWeatherMap API key.
        
        OpenWeatherMap API: Weather data provider
        Endpoint: https://api.openweathermap.org/data/2.5/
        Sign up: openweathermap.org/api
        """
        api_key = self.api_keys.get('openweathermap')
        
        # Test with a sample location (Nairobi, Kenya)
        url = f"https://api.openweathermap.org/data/2.5/weather?lat=-1.286389&lon=36.817223&appid={api_key}"
        
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'valid': True,
                    'message': f'API key valid - {data.get("name", "Location")} weather retrieved',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 401:
                return {
                    'valid': False,
                    'message': 'Invalid API key',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'valid': False,
                    'message': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_accuweather(self) -> dict:
        """
        Validate AccuWeather API key.
        
        AccuWeather API: Alternative weather provider
        Endpoint: https://dataservice.accuweather.com/
        Sign up: developer.accuweather.com
        """
        api_key = self.api_keys.get('accuweather')
        
        # Test with location search (Nairobi)
        url = f"https://dataservice.accuweather.com/locations/v1/cities/search?apikey={api_key}&q=Nairobi"
        
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                return {
                    'valid': True,
                    'message': 'API key valid - access granted',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 401 or response.status_code == 403:
                return {
                    'valid': False,
                    'message': 'Invalid or unauthorized API key',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'valid': False,
                    'message': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_huggingface(self) -> dict:
        """
        Validate Hugging Face API token.
        
        Hugging Face API: Multilingual NLP for SMS generation
        Endpoint: https://api-inference.huggingface.co/
        Sign up: huggingface.co
        """
        token = self.api_keys.get('huggingface')
        
        # Test with a simple inference request
        url = "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-sw"
        headers = {
            'Authorization': f'Bearer {token}'
        }
        payload = {
            'inputs': 'Hello, this is a test.'
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            
            if response.status_code == 200:
                return {
                    'valid': True,
                    'message': 'Token valid - translation model accessible',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 401:
                return {
                    'valid': False,
                    'message': 'Invalid token',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 503:
                # Model loading (still valid token)
                return {
                    'valid': True,
                    'message': 'Token valid - model is loading',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'valid': False,
                    'message': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    def _validate_africas_talking(self) -> dict:
        """
        Validate Africa's Talking API key.
        
        Africa's Talking: SMS provider for Africa
        Endpoint: https://api.africastalking.com/
        Sign up: africastalking.com
        """
        api_key = self.api_keys.get('africas_talking')
        
        # Test with user data endpoint
        url = "https://api.africastalking.com/version1/user"
        headers = {
            'ApiKey': api_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                balance = data.get('UserData', {}).get('balance', 'N/A')
                return {
                    'valid': True,
                    'message': f'API key valid - Balance: {balance}',
                    'timestamp': datetime.now().isoformat()
                }
            elif response.status_code == 401:
                return {
                    'valid': False,
                    'message': 'Invalid API key',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'valid': False,
                    'message': f'HTTP {response.status_code}',
                    'timestamp': datetime.now().isoformat()
                }
        
        except Exception as e:
            return {
                'valid': False,
                'message': f'Connection error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    def get_api_key(self, service: str) -> Optional[str]:
        """
        Get API key for a specific service.
        
        Args:
            service: Service name (cgiar, kephis, openweathermap, etc.)
            
        Returns:
            str or None: API key if configured
        """
        return self.api_keys.get(service)
    
    def save_config(self, output_path: Optional[str] = None):
        """
        Save API configuration to JSON file.
        
        Args:
            output_path: Output file path (default: config/api_keys.json)
        """
        output_path = output_path or self.config_path
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        config_data = {
            'api_keys': self.api_keys,
            'last_validated': datetime.now().isoformat(),
            'status': self.api_status
        }
        
        with open(output_file, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        print(f"\n✓ Configuration saved: {output_file}")
    
    def generate_setup_guide(self, output_path: str = "API_SETUP_GUIDE.md"):
        """
        Generate API setup guide with instructions.
        
        Args:
            output_path: Output markdown file path
        """
        guide = """# AgroShield API Configuration Guide

## Phase 2: API Key Acquisition (1 week)

This guide provides step-by-step instructions for obtaining API keys from all required services.

---

## 1. CGIAR Plant Health Database

**Purpose**: Access to international agricultural research and disease treatment database

**Steps**:
1. Visit: https://www.cgiar.org/
2. Contact: research@cgiar.org
3. Subject: "API Access Request for AgroShield Agricultural Platform"
4. Email template:
   ```
   Dear CGIAR Research Team,
   
   I am developing AgroShield, an AI-powered agricultural advisory platform 
   for Kenyan smallholder farmers. The platform provides plant disease 
   detection and treatment recommendations.
   
   I would like to request API access to the CGIAR Plant Health Database 
   to enhance our disease treatment recommendations with internationally 
   recognized research data.
   
   Project details:
   - Target users: Kenyan smallholder farmers
   - Use case: Disease identification and treatment guidance
   - Expected API usage: ~1,000 requests/day
   
   Thank you for considering this request.
   
   Best regards,
   [Your Name]
   ```

**Expected Response Time**: 1-2 weeks

**Configuration**:
```bash
export CGIAR_API_KEY="your_api_key_here"
```

---

## 2. KEPHIS (Kenya Plant Health Inspectorate Service)

**Purpose**: Access to registered agricultural products and treatments in Kenya

**Steps**:
1. Visit: https://www.kephis.go.ke/
2. Navigate to: Developer Portal (kephis.go.ke/developers)
3. Register for API access
4. Fill out application form with:
   - Organization name
   - Use case description
   - Expected request volume

**Expected Response Time**: 3-5 business days

**Configuration**:
```bash
export KEPHIS_API_KEY="your_api_key_here"
```

---

## 3. OpenWeatherMap

**Purpose**: Real-time weather data and 7-day forecasts

**Steps**:
1. Visit: https://openweathermap.org/api
2. Click "Sign Up" (top right)
3. Create account (email verification required)
4. Navigate to: API Keys section
5. Copy your default API key (generated automatically)
6. Choose plan:
   - **Free tier**: 1,000 requests/day (sufficient for testing)
   - **Startup plan**: $40/month for 100,000 requests/day (production)

**Features Available**:
- Current weather data
- 7-day forecast
- Historical data (paid plans)
- Weather alerts

**Expected Response Time**: Immediate (API key available after signup)

**Configuration**:
```bash
export OPENWEATHERMAP_API_KEY="your_api_key_here"
```

**Test Command**:
```bash
curl "https://api.openweathermap.org/data/2.5/weather?lat=-1.286389&lon=36.817223&appid=YOUR_API_KEY"
```

---

## 4. AccuWeather (Optional)

**Purpose**: Alternative weather provider for redundancy

**Steps**:
1. Visit: https://developer.accuweather.com/
2. Click "Register" (top right)
3. Create developer account
4. Navigate to: My Apps → Add a New App
5. Fill out app details:
   - App Name: "AgroShield"
   - Description: "Agricultural advisory platform"
6. Copy API key from app dashboard

**Plan Options**:
- **Limited Trial**: 50 requests/day (free)
- **Core Plan**: $25/month for 1,500 requests/day

**Expected Response Time**: Immediate

**Configuration**:
```bash
export ACCUWEATHER_API_KEY="your_api_key_here"
```

---

## 5. Hugging Face

**Purpose**: Multilingual NLP for Swahili SMS generation

**Steps**:
1. Visit: https://huggingface.co/
2. Click "Sign Up" (top right)
3. Create account (email/GitHub/Google)
4. Navigate to: Settings → Access Tokens
5. Click "New token"
6. Token settings:
   - Name: "AgroShield"
   - Role: "Read" (sufficient for inference)
7. Copy token (save securely - shown only once)

**Models to Use**:
- **Translation**: Helsinki-NLP/opus-mt-en-sw (English → Swahili)
- **Summarization**: facebook/bart-large-cnn

**Expected Response Time**: Immediate

**Configuration**:
```bash
export HUGGINGFACE_TOKEN="your_token_here"
```

**Test Command**:
```python
import requests

url = "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-sw"
headers = {"Authorization": "Bearer YOUR_TOKEN"}
payload = {"inputs": "The plant has late blight disease."}

response = requests.post(url, headers=headers, json=payload)
print(response.json())
```

---

## 6. FAO SoilGrids

**Purpose**: Global soil property data (no API key required)

**Endpoint**: https://rest.isric.org/soilgrids/v2.0/

**Features**:
- Soil pH
- Organic carbon
- Bulk density
- Texture (clay, silt, sand)

**Usage**: No registration needed - public API

**Example Request**:
```bash
curl "https://rest.isric.org/soilgrids/v2.0/properties/query?lat=-1.286389&lon=36.817223&property=phh2o&depth=0-5cm"
```

---

## 7. Africa's Talking (SMS)

**Purpose**: SMS notifications for Kenyan farmers

**Steps**:
1. Visit: https://africastalking.com/
2. Click "Get Started" (top right)
3. Create account
4. Navigate to: Dashboard → Sandbox
5. Copy API Key and Username
6. Top up account (SMS credits)

**Pricing**:
- Kenya SMS: ~0.80 KES per SMS
- Bulk discounts available

**Configuration**:
```bash
export AFRICAS_TALKING_API_KEY="your_api_key_here"
export AFRICAS_TALKING_USERNAME="your_username"
```

---

## Configuration File Setup

Create `config/api_keys.json`:

```json
{
  "api_keys": {
    "cgiar": "YOUR_CGIAR_API_KEY",
    "kephis": "YOUR_KEPHIS_API_KEY",
    "openweathermap": "YOUR_OPENWEATHERMAP_KEY",
    "accuweather": "YOUR_ACCUWEATHER_KEY",
    "huggingface": "YOUR_HUGGINGFACE_TOKEN",
    "africas_talking": "YOUR_AFRICAS_TALKING_KEY"
  }
}
```

**Security Note**: Never commit `api_keys.json` to version control!

Add to `.gitignore`:
```
config/api_keys.json
.env
```

---

## Validation Script

Run validation after obtaining API keys:

```bash
python backend/app/config/api_config.py
```

This will:
- ✓ Test each API key
- ✓ Check connectivity
- ✓ Verify permissions
- ✓ Display account status (balance, limits, etc.)

---

## Troubleshooting

### Common Issues

**1. "Invalid API Key" Error**
- Check for typos in key/token
- Verify key is active (not expired)
- Confirm correct environment variable name

**2. "Rate Limit Exceeded"**
- Check your plan limits
- Implement request caching
- Upgrade to higher tier if needed

**3. "Connection Timeout"**
- Check internet connectivity
- Verify API endpoint URL is correct
- Some services may be geolocked (use VPN if needed)

**4. "Unauthorized" (403/401)**
- Verify API key has correct permissions
- Check if service requires additional authentication
- Confirm account is in good standing (billing current)

---

## Summary Checklist

- [ ] CGIAR API key requested (research@cgiar.org)
- [ ] KEPHIS API key obtained (kephis.go.ke/developers)
- [ ] OpenWeatherMap API key created (openweathermap.org/api)
- [ ] Hugging Face token generated (huggingface.co)
- [ ] Africa's Talking account set up (africastalking.com)
- [ ] All keys added to `config/api_keys.json`
- [ ] Environment variables configured
- [ ] Validation script run successfully
- [ ] `.gitignore` updated to exclude sensitive files

---

## Estimated Timeline

| Service | Application | Approval | Total |
|---------|-------------|----------|-------|
| CGIAR | 30 min | 1-2 weeks | 1-2 weeks |
| KEPHIS | 1 hour | 3-5 days | 3-5 days |
| OpenWeatherMap | 5 min | Immediate | 5 min |
| AccuWeather | 10 min | Immediate | 10 min |
| Hugging Face | 5 min | Immediate | 5 min |
| FAO SoilGrids | N/A | N/A | 0 (public) |
| Africa's Talking | 15 min | Immediate | 15 min |

**Total Time**: ~1 week (waiting for CGIAR/KEPHIS approvals)

---

## Next Steps

After obtaining all API keys:
1. Run `python backend/app/config/api_config.py` to validate
2. Proceed to **Phase 3: Integration Testing**
3. Test end-to-end workflows with real API data
4. Monitor API usage and costs

For questions or issues, contact: support@agroshield.ke
"""
        
        with open(output_path, 'w') as f:
            f.write(guide)
        
        print(f"✓ API setup guide generated: {output_path}")


def main():
    """
    Main function for API configuration validation.
    """
    print("\n" + "="*60)
    print("AGROSHIELD API CONFIGURATION")
    print("="*60)
    
    # Initialize config
    config = APIConfig()
    
    # Validate all keys
    results = config.validate_all_keys()
    
    # Print summary
    print("\n" + "="*60)
    print("VALIDATION SUMMARY")
    print("="*60)
    
    valid_count = sum(1 for r in results.values() if r['valid'])
    total_count = len(results)
    
    print(f"Valid APIs: {valid_count}/{total_count}")
    
    if valid_count == total_count:
        print("✓ All API keys configured and valid!")
    else:
        print(f"⚠️  {total_count - valid_count} API(s) need configuration")
    
    # Save config
    config.save_config()
    
    # Generate setup guide
    config.generate_setup_guide()
    
    print("\n" + "="*60)
    print("See API_SETUP_GUIDE.md for detailed instructions")
    print("="*60)


if __name__ == "__main__":
    main()
