import querystring from 'querystring'

export async function apiGet(route: string, params: { [key: string]: any }): Promise<any> {
  const client = window.localStorage.getItem("client")
  const url = `https://api.mwater.co/v3/${route}?${querystring.stringify({ ...params, client })}`

  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(await resp.text())
  }
  return resp.json()
}

export async function apiPost(route: string, params: { [key: string]: any }, body: any): Promise<any> {
  const client = window.localStorage.getItem("client")
  const url = `https://api.mwater.co/v3/${route}?${querystring.stringify({ ...params, client })}`

  const resp = await fetch(url, { 
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })
  if (!resp.ok) {
    throw new Error(await resp.text())
  }
  return resp.json()
}