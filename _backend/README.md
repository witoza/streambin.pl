# StreamBIN

Transfer files and folders by a Web Browser.

Stream via global webpage http://streambin.pl/ or set up local instalation


### Local installation

Install locally by 

```
$ npm i --global streambin
$ streambin -h http://192.168.0.1/ -p 9001
```

Now open http://localhost:9001 and share your files. The host (-h) parameter is used to create links to resources - you can use your internal LAN Ip address for that.

*** Please note it was tested/developed under npm 4.5, it does'nt work under 6.4 and 6.5 (some WS issues) ***