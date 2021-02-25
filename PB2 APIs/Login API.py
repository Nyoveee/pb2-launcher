import requests
import re
import hashlib 
#------------ VARIABLES DECLARION -----------------
url = "https://www.plazmaburst2.com"
regEx = "Welcome back, "
pattern2 = re.compile(regEx)
#--------------- LOGIN FUNCTION -----------------
def loginAndRetrieve(login, password):
    with requests.session() as currentSession:
        payload = {
            'Submit' : 'Log-in',
            'login' : login,
            'password' : password
        }
        response = currentSession.post(url, data = payload)
        if pattern2.search(response.text):
            print("Login succesful.")
            return
        else:
            print("Login credentials incorrect!")
            return
    
#--------- ENTER CREDENTIALS FUNCTION -------------
def enterCredentials():
    login = input("Enter your PB2 login: ")
    print("---")
    password = input("Enter your PB2 password: ")
    result = hashlib.md5(password.encode())
    print("\n--- Sending credentials to PB2 web server... ---")
    return login, result.hexdigest()
    
        
#-------------- START OF EXECUTION ---------------
if __name__ == "__main__":
    login, password = enterCredentials()
    loginAndRetrieve(login, password)
    


    
    