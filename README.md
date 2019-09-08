Coref Model Analyzer Debug Tool
----
### Introduction
* This is an debug tool to analyzing coref model result
* To get model result, see [preCo:PreCo: A Large-scale Dataset in Preschool Vocabulary for Coreference Resolution](http://gitlab.yitu-inc.com/coref/coref)

### Environment
Make sure you have npm v6.4.1 or later installed

### Quick Overview
```sh 
$ npm install
$ npm start
```
### Getting Started
#### Installation
To install the dependencies required to compile, run:
```sh
$ npm install
```

#### Configuration
Put model result data into ```src/AnnoData.js```.
The data structure is like:
```
globalControl                           //constants
|
|
first_file_data
|       +---- annoResultState
|             |
|             +--- anno_result          //model result
|             +--- taskFile             
|                  |
|                  +--- _id             //file name
|                  +--- sentence        
|                  +--- gt_result
|                  +--- is_gt           //constant
|       +----- mention_scores
|       +----- antecedent_scores
|       
second_file_data
|
……
```
#### Run
```sh
$ npm start
```
#### Features
* Choose File: show the list of file data name, can be configured in ```src/AnnoData.js```, ```default: first file```
* Left Side: show the Negative/Positive/Match mention list
* gt answer: result of ```gt_result``` and ```sentence``` in ```src/AnnoData.js```
* model answer: result of coref model(```anno_result``` in ```src/AnnoData.js```)
* Right Side: can be sorted by position or by score, click one Mention Score, related Antecedent Score will be shown

**Notice** : ```Click any of those words, those related words in other panels will be highlighted```

![Example](/img/debug_tool.png)
