#! /usr/bin/env node

"use strict";

const Chance = require('chance'), chance = new Chance();
const log4js = require('log4js');
const jsonutil = require('jsonutil');

const logger = log4js.getLogger();

logger.info("hello sir")