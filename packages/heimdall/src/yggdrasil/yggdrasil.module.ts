/**
 * YGGDRASIL Module
 *
 * The main orchestration module that connects all components of the tree.
 * This is where the magic happens - query flows through all branches
 * and returns validated, sourced responses.
 */

import { Module } from '@nestjs/common';
import { YggdrasilService } from './yggdrasil.service.js';
import { YggdrasilController } from './yggdrasil.controller.js';
import { ThinkingService } from './thinking.service.js';
import { RatatoaskBridge } from './bridges/ratatosk.bridge.js';
import { MimirBridge } from './bridges/mimir.bridge.js';
import { VolvaBridge } from './bridges/volva.bridge.js';
import { HuginBridge } from './bridges/hugin.bridge.js';
import { ThingBridge } from './bridges/thing.bridge.js';
import { OdinBridge } from './bridges/odin.bridge.js';
import { MuninBridge } from './bridges/munin.bridge.js';

@Module({
  controllers: [YggdrasilController],
  providers: [
    YggdrasilService,
    ThinkingService,
    RatatoaskBridge,
    MimirBridge,
    VolvaBridge,
    HuginBridge,
    ThingBridge,
    OdinBridge,
    MuninBridge,
  ],
  exports: [YggdrasilService, ThinkingService],
})
export class YggdrasilModule {}
