import requests
import re
import sys
#------------ VARIABLES DECLARION -----------------
url = "https://www.plazmaburst2.com/launcher/index.php?a=&s=&pg=0"

#regexTest = "Adlandipqn"
regExNewsDissect = "<strong class=\"news_date\">(.+?(?=</strong>))</strong>(.+?(?=(?:<div class=\")|(?:)))(?:<div class=\"news_div\"></div>|\s*<div align=\"center\">)"
regExNewsCount = "<a href=\"https://www\.plazmaburst2\.com/launcher/index\.php\?a=&s=&pg=(\d+)\">"
#https://regex101.com/
#Regex to test for news
pattern = re.compile(regExNewsDissect)
pattern2 = re.compile(regExNewsCount)

class PB2News:
    date = "Default"
    article = "Default"

    def __init__(self, date, article):
        self.date = date
        self.article = article

listOfPB2News = []
#-------------- FUNCTION ---------------
def getNewsHtml():
    response = requests.get(url)
    if response.status_code == 200:
        return response
    else:
        return None
        

def newsApi(response):
    listOfNews = pattern.findall(response.text)
    
    if not listOfNews:
        return None
    
    for group in listOfNews:
        type = 0
        for data in group:
            if type == 0:
                date = data
                #print("-- Date --")
            else:
                article = data
                #print("-- News Article --")
                listOfPB2News.append(PB2News(date,article))

            #print(data)
            #print()
            type += 1

    #for PB2NewsClass in listOfPB2News:
    #    print(PB2NewsClass.date)
    #    print(PB2NewsClass.article)
    #    print()
    return listOfPB2News

def newsCount(response):
    listOfNews = pattern2.findall(response.text)

    if not listOfNews:
        return None

    return listOfNews[-1]
#-------------- START OF EXECUTION ---------------
response = getNewsHtml()

if response == None:
    print("PB2 server does not seem to be responding. Contact Nyove if issue persist.")
    sys.exit()

listOfPB2News = newsApi(response)

if listOfPB2News == None:
    print("Failure to extract news article. Contact Nyove if issue persist.")
    sys.exit()

totalNews = newsCount(response)

if totalNews == None:
    print("Failure to extract news article count. Contact Nyove if issue persist.")
    sys.exit()

