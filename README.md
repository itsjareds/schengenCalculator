Forked version of grimb300/schengenCalculator. I added some functionality for my own purposes and figured someone might find
these changes useful.

1) Added a new line to the chart which shows the number of continuous days in the Schengen Zone allowed.
   This is useful for planning purposes, for example to see which upcoming day is ideal for timing a visit when days are limited.
2) Added a "Remove a trip" button to remove rows in the trips table, starting from the bottom.
3) Inverted the date parsing to use DD/MM/YY since European date format is more comfortable for me.
4) Various unimportant code refactoring; split out some logic into functions and renamed variables to my taste.


======== Original README ========

This is my attempt at a web app that calculates the amount of time spent in the Schengen Area.
Using this as my useful version of Hello World! to try out various web development languages and stacks.
The versions are as follows:

  orig/ -- This is my first attempt at using javaScript. Relied heavily on borrowed code from an online tutorial.
  For my next trick, I want to create a version using vanilla html/css/js using what I learned in Colt Steele's WDBC course
