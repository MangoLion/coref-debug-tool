Coref Model Analyzer Debug Tool
----
### Introduction
* This is an debug tool to analyzing coref model result
* To get model result format, see [PreCo: A Large-scale Dataset in Preschool Vocabulary for Coreference Resolution](https://preschool-lab.github.io/PreCo/)

### Environment
Make sure you have npm v6.4.1 or later installed

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
|             +--- model_result          //model result
|             +--- taskFile             
|                  |
|                  +--- _id             //file name
|                  +--- sentence        
|                  +--- ground_truth
|       +----- mention_scores
|       +----- antecedent_scores
|       
second_file_data
|
……
```
#### Run
```sh
# This will run a server at http://localhost:3000
$ npm start
```
#### Features
* Choose File: show the list of file data name, can be configured in ```src/AnnoData.js```, ```default: first file```
* Left Side: show the Missed/Wrong/Matched mention list
* Ground Truth: mention and coreferences in Ground Truth.
* Model Results: mention and coreferences in Model Results.
* Right Side: can be sorted by position or by score, click one mention, related Antecedent Score will be shown on the next block.

**Notice** : ```Click any of those words, those related words in other panels will be highlighted```

![image](/img/debug_tool.png)
