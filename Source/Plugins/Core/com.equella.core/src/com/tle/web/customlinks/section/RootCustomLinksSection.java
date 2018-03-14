/*
 * Copyright 2017 Apereo
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.tle.web.customlinks.section;

import com.tle.web.sections.SectionInfo;
import com.tle.web.sections.equella.layout.OneColumnLayout;
import com.tle.web.sections.equella.layout.OneColumnLayout.OneColumnLayoutModel;
import com.tle.web.settings.menu.SettingsUtils;
import com.tle.web.template.Breadcrumbs;
import com.tle.web.template.Decorations;

public class RootCustomLinksSection extends OneColumnLayout<OneColumnLayoutModel>
{
	@Override
	public Class<OneColumnLayoutModel> getModelClass()
	{
		return OneColumnLayoutModel.class;
	}

	@Override
	protected void addBreadcrumbsAndTitle(SectionInfo info, Decorations decorations, Breadcrumbs crumbs)
	{
		decorations.setContentBodyClass("customlinks"); //$NON-NLS-1$
		decorations.setOptions(false);

		crumbs.addToStart(SettingsUtils.getBreadcrumb(info));
	}
}
