/*
 * Licensed to The Apereo Foundation under one or more contributor license
 * agreements. See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * The Apereo Foundation licenses this file to you under the Apache License,
 * Version 2.0, (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.tle.core.copyright.service;

import com.tle.beans.activation.ActivateRequest;
import com.tle.beans.item.Item;
import com.tle.beans.item.ItemId;
import com.tle.beans.item.attachments.Attachment;
import com.tle.beans.item.attachments.IAttachment;
import com.tle.core.copyright.Holding;
import com.tle.core.copyright.Portion;
import com.tle.core.copyright.Section;
import com.tle.core.copyright.exception.CopyrightViolationException;
import java.util.List;
import java.util.Map;

public interface CopyrightService<H extends Holding, P extends Portion, S extends Section> {
  String getActivationType();

  Item getCopyrightedItem(ItemId item);

  boolean isCopyrightedItem(Item item);

  S getSectionForAttachment(Item item, String attachmentUuid);

  H getHoldingForItem(Item item);

  List<ActivateRequest> getCurrentOrPendingActivations(H holding);

  Attachment getSectionAttachmentForFilepath(Item item, String filepath);

  CopyrightViolationException createViolation(Item item);

  String citate(H holding, P portion);

  Map<Long, H> getHoldingsForItems(List<Item> items);

  Map<Long, List<P>> getPortionsForItems(List<Item> items);

  AgreementStatus getAgreementStatus(Item item, IAttachment attachment);

  void acceptAgreement(Item item, IAttachment attachment);
}
