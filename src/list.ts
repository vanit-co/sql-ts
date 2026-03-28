const zipLongest = (l1: Array<string>, l2: Array<any>): Array<[string ,any]> => {
  const maxLength = Math.max(l1.length, l2.length)
  return Array.from({ length: maxLength }, (_, i) => [l1[i], l2[i]])
}

export { zipLongest }
