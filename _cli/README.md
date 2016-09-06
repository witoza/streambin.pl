# StreamBIN-CLI

Command line interface for StreamBIN

Install by:

```
$ npm i --global streambin-cli
```

now, to share files issue
```
$ streambin-cli -a http://streambin.pl/ -d local share my_file1.txt my_directory
```

Address parameters (-a) and directory uuid (-d) can be skipped.

*** Please note it was tested/developed under npm 4.5, it does'nt work under 6.4 and 6.5 (some WS issues) ***