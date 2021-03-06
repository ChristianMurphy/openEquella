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

package com.tle.web.core.servlet;

import com.tle.common.beans.exception.NotFoundException;
import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@SuppressWarnings("nls")
public abstract class AbstractIdPathServlet extends HttpServlet {
  @Override
  protected final void service(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    String path = request.getPathInfo();
    int i = path.indexOf('/', 1);
    if (i < 0) {
      throw new NotFoundException(path, true);
    }

    if (path.startsWith("/")) {
      path = path.substring(1);
    }

    int firstPart = path.indexOf('/');
    if (firstPart < 0) {
      throw new NotFoundException(path, true);
    }

    service(request, response, path.substring(0, firstPart), path.substring(firstPart + 1));
  }

  protected abstract void service(
      HttpServletRequest request, HttpServletResponse response, String id, String path)
      throws ServletException, IOException;
}
